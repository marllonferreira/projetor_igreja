document.getElementById('abrirProjetor').addEventListener('click', () => {
    chrome.windows.create({
        url: 'projetor.html',
        type: 'popup',
        width: 1280,
        height: 720
    }, (window) => {
        const tabId = window.tabs[0].id;
        // Salva localmente e notifica o background
        chrome.storage.local.set({ "projetorTabId": tabId });
        chrome.runtime.sendMessage({ action: "setProjectorTabId", tabId: tabId });
    });
});

document.getElementById('enviarVideo').addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab.url && (tab.url.includes("youtube.com/watch") || tab.url.includes("youtu.be/"))) {
        const url = new URL(tab.url);
        let videoId = url.searchParams.get("v");

        if (!videoId && tab.url.includes("youtu.be/")) {
            videoId = tab.url.split("/").pop().split("?")[0];
        }

        if (videoId) {
            // URL limpa, sem parâmetros. A limpeza agora é baseada no tabId via background.js
            const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

            chrome.storage.local.get(["projetorTabId"], (result) => {
                const tabId = result.projetorTabId;

                if (tabId) {
                    chrome.tabs.update(tabId, { url: watchUrl }, (tab) => {
                        if (chrome.runtime.lastError) {
                            abrirNovaJanela(watchUrl);
                        }
                    });
                } else {
                    abrirNovaJanela(watchUrl);
                }
            });
        }
    } else {
        alert("Abra um vídeo do YouTube primeiro!");
    }
});

function abrirNovaJanela(url) {
    chrome.windows.create({
        url: url,
        type: 'popup',
        width: 1280,
        height: 720
    }, (window) => {
        const tabId = window.tabs[0].id;
        chrome.storage.local.set({ "projetorTabId": tabId });
        chrome.runtime.sendMessage({ action: "setProjectorTabId", tabId: tabId });
    });
}

// ── Controles Remotos ──

// Botão unificado Play / Pause com feedback visual
let videoPlayando = false;

document.getElementById('btnPlayPause').addEventListener('click', () => {
    const cmd = videoPlayando ? 'pause' : 'play';
    chrome.storage.local.get(["projetorTabId"], (result) => {
        const tabId = result.projetorTabId;
        if (!tabId) return;
        chrome.tabs.sendMessage(tabId, { action: "controlVideo", command: cmd }, (resp) => {
            if (chrome.runtime.lastError || !resp) return;
            atualizarBotaoPlay(resp.playing);
        });
    });
});

// Botão Tela Cheia: alterna fullscreen na aba do projetor
let projetorEmFullscreen = false;

document.getElementById('btnFullscreen').addEventListener('click', () => {
    chrome.storage.local.get(["projetorTabId"], (result) => {
        const tabId = result.projetorTabId;
        if (!tabId) return;
        chrome.tabs.sendMessage(tabId, { action: "controlVideo", command: "fullscreen_toggle" }, (resp) => {
            if (chrome.runtime.lastError || !resp) return;
            atualizarBotaoFullscreen(resp.fullscreen);
        });
    });
});

function atualizarBotaoFullscreen(ativo) {
    projetorEmFullscreen = ativo;
    const btn = document.getElementById('btnFullscreen');
    const icon = btn.querySelector('.icon');
    const label = btn.querySelector('span:last-child');
    if (ativo) {
        icon.textContent = '⛶';
        label.textContent = 'SAIR F.C.';
        btn.style.background = 'linear-gradient(135deg, #343a40, #1a1d21)';
        btn.style.borderColor = '#555';
    } else {
        icon.textContent = '⛶';
        label.textContent = 'TELA CHEIA';
        btn.style.background = 'linear-gradient(135deg, #7c5cbf, #5b3fa0)';
        btn.style.borderColor = '#7c5cbf';
    }
}

// Botão Mute: alterna estado e atualiza ícone com feedback visual
document.getElementById('btnMute').addEventListener('click', () => {
    chrome.storage.local.get(["projetorTabId"], (result) => {
        const tabId = result.projetorTabId;
        if (!tabId) return;
        chrome.tabs.sendMessage(tabId, { action: "controlVideo", command: "mute_toggle" }, (resp) => {
            if (chrome.runtime.lastError || !resp) return;
            atualizarIconeMute(resp.muted);
        });
    });
});

// Slider de volume
const slider = document.getElementById('volumeSlider');
const label = document.getElementById('volumeLabel');

slider.addEventListener('input', () => {
    const vol = parseInt(slider.value);
    label.textContent = vol + '%';
    if (vol > 0) atualizarIconeMute(false);
    chrome.storage.local.get(["projetorTabId"], (result) => {
        const tabId = result.projetorTabId;
        if (tabId) {
            chrome.tabs.sendMessage(
                tabId,
                { action: "controlVideo", command: "volume", value: vol / 100 },
                (resp) => {
                    if (chrome.runtime.lastError || !resp) return;
                    // Confirma o volume real devolvido pelo player YouTube
                    const volReal = Math.round(resp.volume * 100);
                    slider.value = volReal;
                    label.textContent = volReal + '%';
                    atualizarIconeMute(resp.muted);
                }
            );
        }
    });
});

// Atualiza o ícone do botão de mute (🔊 / 🔇)
function atualizarIconeMute(muted) {
    document.getElementById('btnMute').textContent = muted ? '🔇' : '🔊';
}

// Atualiza o botão de play/pause conforme estado real
function atualizarBotaoPlay(playing) {
    videoPlayando = playing;
    const btn = document.getElementById('btnPlayPause');
    const icon = btn.querySelector('.icon');
    const label = btn.querySelector('span:last-child');
    if (playing) {
        icon.textContent = '⏸';
        label.textContent = 'PAUSE';
        btn.style.background = 'linear-gradient(135deg, #555, #333)';
        btn.style.borderColor = '#555';
    } else {
        icon.textContent = '▶';
        label.textContent = 'PLAY';
        btn.style.background = 'linear-gradient(135deg, #27ae60, #1e8449)';
        btn.style.borderColor = '#27ae60';
    }
}

// Tenta sincronizar estado; se o content script ainda não respondeu, tenta de novo
function carregarEstadoProjetor(tentativa) {
    tentativa = tentativa || 1;
    chrome.storage.local.get(["projetorTabId"], (result) => {
        const tabId = result.projetorTabId;
        if (!tabId) return;
        chrome.tabs.sendMessage(
            tabId,
            { action: "controlVideo", command: "getVideoState" },
            (resp) => {
                if (chrome.runtime.lastError || !resp) {
                    // Se falhou e ainda temos tentativas, aguarda e tenta novamente
                    if (tentativa < 4) setTimeout(() => carregarEstadoProjetor(tentativa + 1), 400);
                    return;
                }
                const vol = Math.round(resp.volume * 100);
                slider.value = vol;
                label.textContent = vol + '%';
                atualizarIconeMute(resp.muted);
                atualizarBotaoPlay(resp.playing);
            }
        );
    });
}
// Pequena espera inicial para garantir que o content script está pronto
setTimeout(() => carregarEstadoProjetor(1), 150);

function enviarComandoProjetor(comando) {
    chrome.storage.local.get(["projetorTabId"], (result) => {
        const tabId = result.projetorTabId;
        if (tabId) {
            chrome.tabs.sendMessage(tabId, { action: "controlVideo", command: comando });
        }
    });
}