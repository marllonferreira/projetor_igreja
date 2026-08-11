let currentSettings = {
    targetMonitor: 'auto',
    openFullscreen: true,
    windowSize: '1280x720',
    showClose: true,
    showStop: true,
    showFullscreen: true,
    showVolume: true,
    showProgress: true,
    lastPlayingState: true,
    lastCurrentTime: 0,
    lastDuration: 0,
    lastVideoTitle: ""
};

function aplicarVisibilidadeControles() {
    const btnClose = document.getElementById('fecharProjetor');
    if (btnClose) btnClose.style.display = currentSettings.showClose ? 'flex' : 'none';

    const btnStop = document.getElementById('btnStop');
    if (btnStop) btnStop.style.display = currentSettings.showStop ? 'flex' : 'none';

    const btnFs = document.getElementById('btnFullscreen');
    if (btnFs) btnFs.style.display = currentSettings.showFullscreen ? 'flex' : 'none';

    const volSec = document.getElementById('volumeSection');
    if (volSec) volSec.style.display = currentSettings.showVolume ? 'block' : 'none';

    const progSec = document.getElementById('progressSection');
    if (progSec) progSec.style.display = currentSettings.showProgress ? 'block' : 'none';
}

chrome.storage.local.get(["projetorSettings"], (result) => {
    if (result.projetorSettings) {
        currentSettings = { ...currentSettings, ...result.projetorSettings };
    }
    
    // Aplica estado imediato para evitar delay/piscada visual
    if (typeof atualizarBotaoPlay === 'function') {
        atualizarBotaoPlay(currentSettings.lastPlayingState);
    }
    if (typeof atualizarProgresso === 'function') {
        atualizarProgresso(currentSettings.lastCurrentTime, currentSettings.lastDuration, currentSettings.lastVideoTitle, true);
    }
    
    if (document.getElementById('configFullscreen')) {
        document.getElementById('configFullscreen').checked = currentSettings.openFullscreen;
        document.getElementById('configWindowSize').value = currentSettings.windowSize;
        document.getElementById('configWindowSize').disabled = currentSettings.openFullscreen;
        
        document.getElementById('prefShowClose').checked = currentSettings.showClose;
        document.getElementById('prefShowStop').checked = currentSettings.showStop;
        document.getElementById('prefShowFullscreen').checked = currentSettings.showFullscreen;
        document.getElementById('prefShowVolume').checked = currentSettings.showVolume;
        document.getElementById('prefShowProgress').checked = currentSettings.showProgress;
    }
    
    aplicarVisibilidadeControles();
});

if (document.getElementById('btnSettings')) {
    const btnSettings = document.getElementById('btnSettings');
    btnSettings.addEventListener('click', () => {
        const isSettingsOpen = document.getElementById('settingsView').style.display === 'block';

        if (!isSettingsOpen) {
            btnSettings.textContent = '❌';
            btnSettings.title = 'Fechar e Cancelar';
            document.getElementById('mainView').style.display = 'none';
            document.getElementById('settingsView').style.display = 'block';

            const monitorSelect = document.getElementById('configMonitor');
            monitorSelect.innerHTML = '<option value="auto">Automático (Secundário)</option>';
            
            if (chrome.system && chrome.system.display) {
                chrome.system.display.getInfo((displays) => {
                    displays.forEach((d, index) => {
                        const opt = document.createElement('option');
                        opt.value = d.id;
                        let name = `Monitor ${index + 1} (${d.bounds.width}x${d.bounds.height})`;
                        if (d.isPrimary) name += ' - Principal';
                        opt.textContent = name;
                        monitorSelect.appendChild(opt);
                    });
                    monitorSelect.value = currentSettings.targetMonitor;
                });
            }
        } else {
            // Fechar configurações (Cancelar)
            btnSettings.textContent = '⚙️';
            btnSettings.title = 'Configurações';
            
            // Restaura a UI para o que estava salvo
            document.getElementById('configFullscreen').checked = currentSettings.openFullscreen;
            document.getElementById('configWindowSize').value = currentSettings.windowSize;
            document.getElementById('configWindowSize').disabled = currentSettings.openFullscreen;
            document.getElementById('prefShowClose').checked = currentSettings.showClose;
            document.getElementById('prefShowStop').checked = currentSettings.showStop;
            document.getElementById('prefShowFullscreen').checked = currentSettings.showFullscreen;
            document.getElementById('prefShowVolume').checked = currentSettings.showVolume;
            document.getElementById('prefShowProgress').checked = currentSettings.showProgress;

            document.getElementById('settingsView').style.display = 'none';
            document.getElementById('mainView').style.display = 'block';
        }
    });
}

if (document.getElementById('configFullscreen')) {
    document.getElementById('configFullscreen').addEventListener('change', (e) => {
        document.getElementById('configWindowSize').disabled = e.target.checked;
    });
}

if (document.getElementById('btnSaveSettings')) {
    document.getElementById('btnSaveSettings').addEventListener('click', () => {
        currentSettings.targetMonitor = document.getElementById('configMonitor').value;
        currentSettings.openFullscreen = document.getElementById('configFullscreen').checked;
        currentSettings.windowSize = document.getElementById('configWindowSize').value;
        
        currentSettings.showClose = document.getElementById('prefShowClose').checked;
        currentSettings.showStop = document.getElementById('prefShowStop').checked;
        currentSettings.showFullscreen = document.getElementById('prefShowFullscreen').checked;
        currentSettings.showVolume = document.getElementById('prefShowVolume').checked;
        currentSettings.showProgress = document.getElementById('prefShowProgress').checked;

        chrome.storage.local.set({ "projetorSettings": currentSettings });
        
        aplicarVisibilidadeControles();

        document.getElementById('settingsView').style.display = 'none';
        document.getElementById('mainView').style.display = 'block';

        const btnSettings = document.getElementById('btnSettings');
        if (btnSettings) {
            btnSettings.textContent = '⚙️';
            btnSettings.title = 'Configurações';
        }
    });
}

if (document.getElementById('fecharProjetor')) {
    let btnCloseConfirma = false;
    let btnCloseTimeout = null;

    document.getElementById('fecharProjetor').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const icon = btn.querySelector('.btn-icon');
        const span = btn.querySelector('span:last-child');
        
        if (!btnCloseConfirma) {
            // Primeiro clique
            btnCloseConfirma = true;
            btn.style.background = 'linear-gradient(135deg, var(--red), #a93226)';
            btn.style.borderColor = 'var(--red)';
            icon.textContent = '⚠️';
            span.textContent = 'Certeza?';
            
            btnCloseTimeout = setTimeout(() => {
                btnCloseConfirma = false;
                btn.style.background = '';
                btn.style.borderColor = '';
                icon.textContent = '❌';
                span.textContent = 'Fechar Telão';
            }, 3000);
            return;
        }
        
        // Segundo clique
        clearTimeout(btnCloseTimeout);
        btnCloseConfirma = false;
        btn.style.background = '';
        btn.style.borderColor = '';
        icon.textContent = '❌';
        span.textContent = 'Fechar Telão';

        chrome.storage.local.get(["projetorTabId"], (result) => {
            const tabId = result.projetorTabId;
            if (tabId) {
                chrome.tabs.remove(tabId, () => {
                    if (chrome.runtime.lastError) console.log("Janela já estava fechada.");
                });
                chrome.storage.local.remove("projetorTabId");
                alternarEstadoControles(false);
            }
        });
    });
}

document.getElementById('abrirProjetor').addEventListener('click', () => {
    abrirNovaJanela('projetor.html');
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
                        } else {
                            setTimeout(() => carregarEstadoProjetor(1), 1000);
                        }
                    });
                } else {
                    abrirNovaJanela(watchUrl);
                }
            });
        }
    } else {
        mostrarAviso("⚠️ Abra um vídeo do YouTube primeiro!");
    }
});

let avisoTimeout;
function mostrarAviso(msg) {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(avisoTimeout);
    avisoTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function abrirNovaJanela(url) {
    let [width, height] = currentSettings.windowSize.split('x').map(Number);
    if (!width) width = 1280;
    if (!height) height = 720;

    let createData = {
        url: url,
        type: 'popup',
        width: width,
        height: height
    };

    const onWindowCreated = (window) => {
        if (chrome.runtime.lastError) {
            console.error("Erro ao criar janela:", chrome.runtime.lastError);
        }
        if (window && window.tabs && window.tabs.length > 0) {
            const tabId = window.tabs[0].id;
            chrome.storage.local.set({ "projetorTabId": tabId });
            chrome.runtime.sendMessage({ action: "setProjectorTabId", tabId: tabId });
            
            if (currentSettings.openFullscreen) {
                chrome.windows.update(window.id, { state: "fullscreen" });
            }
            setTimeout(() => carregarEstadoProjetor(1), 1000);
        }
    };

    if (chrome.system && chrome.system.display) {
        chrome.system.display.getInfo((displays) => {
            if (displays && displays.length > 0) {
                let selectedDisplay = null;

                if (currentSettings.targetMonitor === 'auto') {
                    selectedDisplay = displays.find(d => !d.isPrimary) || displays[1] || displays[0];
                } else {
                    selectedDisplay = displays.find(d => d.id === currentSettings.targetMonitor) || displays[0];
                }

                if (selectedDisplay) {
                    createData.left = selectedDisplay.bounds.left;
                    createData.top = selectedDisplay.bounds.top;
                    
                    if (!currentSettings.openFullscreen && selectedDisplay.workArea) {
                        createData.width = Math.min(width, selectedDisplay.workArea.width);
                        createData.height = Math.min(height, selectedDisplay.workArea.height);
                    }
                }
            }
            chrome.windows.create(createData, onWindowCreated);
        });
    } else {
        chrome.windows.create(createData, onWindowCreated);
    }
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

document.getElementById('btnStop').addEventListener('click', () => {
    chrome.storage.local.get(["projetorTabId"], (result) => {
        const tabId = result.projetorTabId;
        if (!tabId) return;
        chrome.tabs.sendMessage(tabId, { action: "controlVideo", command: "stop" }, (resp) => {
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
    const btn = document.getElementById('btnPlayPause');
    if (!btn) return;
    const icon = btn.querySelector('.icon');
    const label = btn.querySelector('span:last-child');
    videoPlayando = playing;
    
    // Salva estado para a próxima vez que abrir não piscar
    if (currentSettings.lastPlayingState !== playing) {
        currentSettings.lastPlayingState = playing;
        chrome.storage.local.set({ "projetorSettings": currentSettings });
    }

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

function alternarEstadoControles(ativo) {
    const elementos = [
        document.getElementById('btnPlayPause'),
        document.getElementById('btnStop'),
        document.getElementById('btnFullscreen'),
        document.getElementById('btnMute'),
        document.getElementById('volumeSlider')
    ];
    
    elementos.forEach(el => {
        if (el) {
            el.style.opacity = ativo ? '1' : '0.4';
            el.style.pointerEvents = ativo ? 'auto' : 'none';
        }
    });

    if (!ativo) {
        // Reseta UI se desativado
        videoPlayando = false;
        atualizarBotaoPlay(false);
        atualizarBotaoFullscreen(false);
        document.getElementById('volumeSlider').value = 100;
        document.getElementById('volumeLabel').textContent = '100%';
        atualizarIconeMute(false);
        atualizarProgresso(0, 0);
    }
}

// Formata segundos em mm:ss
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00";
    seconds = Math.round(seconds);
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Atualiza a barra de progresso do vídeo
function atualizarProgresso(currentTime, duration, title = "", isInitialLoad = false) {
    const slider = document.getElementById('progressSlider');
    const label = document.getElementById('progressLabel');
    const titleLabel = document.getElementById('videoTitleLabel');
    
    if (titleLabel && title) {
        titleLabel.textContent = title;
        titleLabel.title = title;
    }

    if (slider && label) {
        if (duration > 0) {
            slider.value = (currentTime / duration) * 100;
            label.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
        } else {
            slider.value = 0;
            label.textContent = `00:00 / 00:00`;
        }
    }
    
    if (!isInitialLoad && (currentSettings.lastCurrentTime !== currentTime || currentSettings.lastDuration !== duration || currentSettings.lastVideoTitle !== title)) {
        currentSettings.lastCurrentTime = currentTime;
        currentSettings.lastDuration = duration;
        if (title) currentSettings.lastVideoTitle = title;
        chrome.storage.local.set({ "projetorSettings": currentSettings });
    }
}

let pollInterval = null;

function iniciarPollingDeProgresso() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(() => {
        if (!videoPlayando) return;
        chrome.storage.local.get(["projetorTabId"], (result) => {
            if (result.projetorTabId) {
                chrome.tabs.sendMessage(result.projetorTabId, { action: "controlVideo", command: "getVideoState" }, (resp) => {
                    if (!chrome.runtime.lastError && resp) {
                        atualizarProgresso(resp.currentTime, resp.duration, resp.title);
                    }
                });
            }
        });
    }, 1000);
}

// Tenta sincronizar estado; se o content script ainda não respondeu, tenta de novo
function carregarEstadoProjetor(tentativa) {
    tentativa = tentativa || 1;
    chrome.storage.local.get(["projetorTabId"], (result) => {
        const tabId = result.projetorTabId;
        if (!tabId) {
            alternarEstadoControles(false);
            return;
        }

        chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError || !tab) {
                chrome.storage.local.remove("projetorTabId");
                alternarEstadoControles(false);
                return;
            }

            chrome.tabs.sendMessage(
                tabId,
                { action: "controlVideo", command: "getVideoState" },
                (resp) => {
                    if (chrome.runtime.lastError || !resp) {
                        // Se falhou e ainda temos tentativas, aguarda e tenta novamente
                        if (tentativa < 4) {
                            setTimeout(() => carregarEstadoProjetor(tentativa + 1), 400);
                        } else {
                            alternarEstadoControles(false);
                        }
                        return;
                    }
                    
                    alternarEstadoControles(true);
                    const vol = Math.round(resp.volume * 100);
                    const slider = document.getElementById('volumeSlider');
                    const label = document.getElementById('volumeLabel');
                    if (slider && label) {
                        slider.value = vol;
                        label.textContent = vol + '%';
                    }
                    atualizarIconeMute(resp.muted);
                    atualizarBotaoPlay(resp.playing);
                    atualizarProgresso(resp.currentTime, resp.duration, resp.title);
                    
                    if (!pollInterval) iniciarPollingDeProgresso();
                }
            );
        });
    });
}
// Pequena espera inicial para garantir que o content script está pronto
setTimeout(() => carregarEstadoProjetor(1), 150);

// Escuta quando a aba for fechada para desativar imediatamente
chrome.tabs.onRemoved.addListener((closedTabId) => {
    chrome.storage.local.get(["projetorTabId"], (result) => {
        if (result.projetorTabId === closedTabId) {
            chrome.storage.local.remove("projetorTabId");
            alternarEstadoControles(false);
        }
    });
});

function enviarComandoProjetor(comando) {
    chrome.storage.local.get(["projetorTabId"], (result) => {
        const tabId = result.projetorTabId;
        if (tabId) {
            chrome.tabs.sendMessage(tabId, { action: "controlVideo", command: comando });
        }
    });
}