let currentSettings = {
    targetMonitor: 'auto',
    openFullscreen: true,
    windowSize: '1280x720',
    showClose: true,
    showStop: true,
    showFullscreen: true,
    showVolume: true,
    showProgress: true,
    showPlaylist: true,
    lastPlayingState: true,
    lastCurrentTime: 0,
    lastDuration: 0,
    lastVideoTitle: "",
    bibliaGlobalCor: '#ffffff',
    bibliaGlobalZoom: 100,
    prefMemorizarMidia: true,
    prefFrequenciaAtualizacao: 3,
    timeGlobalCor: '#ffffff',
    timeGlobalTamanho: 8,
    timeGlobalAlinhamento: 'center',
    themeMode: 'auto'
};

// ── Sistema de Temas ──
/**
 * Aplica o tema no elemento <html>.
 * @param {'auto'|'light'|'dark'} mode
 */
function aplicarTema(mode) {
    const html = document.documentElement;
    if (mode === 'dark') {
        html.setAttribute('data-theme', 'dark');
    } else if (mode === 'light') {
        html.setAttribute('data-theme', 'light');
    } else {
        // auto: remove atributo, deixa o @media query cuidar
        html.removeAttribute('data-theme');
    }
}

// Quando o tema do sistema muda e o modo é automático, re-aplica
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (currentSettings.themeMode === 'auto') aplicarTema('auto');
});

/** Sincroniza os radio buttons de tema com o valor atual de currentSettings.themeMode */
function sincronizarRadioTema() {
    const modeAtual = currentSettings.themeMode || 'auto';
    ['themeAuto', 'themeLight', 'themeDark'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = (el.value === modeAtual);
    });
    // Atualiza a classe CSS active nos labels
    ['themeOptAuto', 'themeOptLight', 'themeOptDark'].forEach(id => {
        const label = document.getElementById(id);
        if (label) {
            const radio = label.querySelector('input[type="radio"]');
            if (radio) label.classList.toggle('active', radio.checked);
        }
    });
}

// Listener nos radio buttons para aplicar o tema em tempo real
document.querySelectorAll('input[name="themeMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
        if (radio.checked) {
            aplicarTema(radio.value);
            // Atualiza classe active nos labels visualmente
            ['themeOptAuto', 'themeOptLight', 'themeOptDark'].forEach(id => {
                const label = document.getElementById(id);
                if (label) {
                    const r = label.querySelector('input[type="radio"]');
                    if (r) label.classList.toggle('active', r.checked);
                }
            });
        }
    });
});

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

    autoajusteLayout();
}

function autoajusteLayout() {
    let heavyItemsActive = 0;
    if (currentSettings.showVolume) heavyItemsActive++;
    if (currentSettings.showProgress) heavyItemsActive++;
    if (currentSettings.showPlaylist) heavyItemsActive++;

    if (heavyItemsActive >= 2) {
        document.body.classList.add('compact-mode');
    } else {
        document.body.classList.remove('compact-mode');
    }
}

chrome.storage.local.get(["projetorSettings"], (result) => {
    if (result.projetorSettings) {
        currentSettings = { ...currentSettings, ...result.projetorSettings };
    }

    // Aplica o tema salvo imediatamente (antes de qualquer render) para evitar flash
    aplicarTema(currentSettings.themeMode || 'auto');
    
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
        
        if (document.getElementById('prefShowPlaylist')) {
            document.getElementById('prefShowPlaylist').checked = currentSettings.showPlaylist !== false;
        }
        
        if (document.getElementById('bibliaCor')) {
            document.getElementById('bibliaCor').value = currentSettings.bibliaGlobalCor;
            document.getElementById('bibliaZoom').value = currentSettings.bibliaGlobalZoom;
        }

        if (document.getElementById('timeCor')) {
            document.getElementById('timeCor').value = currentSettings.timeGlobalCor || '#ffffff';
            document.getElementById('timeTamanho').value = currentSettings.timeGlobalTamanho || 8;
            document.getElementById('timeAlinhamento').value = currentSettings.timeGlobalAlinhamento || 'center';
        }

        if (document.getElementById('prefMemorizarMidia')) {
            document.getElementById('prefMemorizarMidia').checked = currentSettings.prefMemorizarMidia;
        }

        if (document.getElementById('configFrequenciaUpdate')) {
            document.getElementById('configFrequenciaUpdate').value = currentSettings.prefFrequenciaAtualizacao || 3;
        }

        // Sincroniza os radio buttons de tema
        sincronizarRadioTema();
    }
    
    aplicarVisibilidadeControles();
    if (typeof atualizarVisibilidadePlaylist === 'function') atualizarVisibilidadePlaylist();
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
            // Garante que "Sobre" esteja fechado
            document.getElementById('sobreView').style.display = 'none';

            // Sincroniza radio buttons de tema ao abrir
            sincronizarRadioTema();

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
            // Fechar configurações (Cancelar) — restaura o tema salvo
            aplicarTema(currentSettings.themeMode || 'auto');
            sincronizarRadioTema();

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
            if (document.getElementById('prefShowPlaylist')) {
                document.getElementById('prefShowPlaylist').checked = currentSettings.showPlaylist !== false;
            }
            
            if (document.getElementById('prefMemorizarMidia')) {
                document.getElementById('prefMemorizarMidia').checked = currentSettings.prefMemorizarMidia;
            }

            document.getElementById('settingsView').style.display = 'none';
            document.getElementById('mainView').style.display = 'block';
        }
    });
}

// ── Tela "Sobre" ──────────────────────────────────────────────────────────────
if (document.getElementById('btnSobre')) {
    const btnSobre = document.getElementById('btnSobre');

    btnSobre.addEventListener('click', () => {
        const sobreView = document.getElementById('sobreView');
        const isSobreOpen = sobreView.style.display === 'block';

        if (!isSobreOpen) {
            // Fechar outras views se abertas
            document.getElementById('mainView').style.display = 'none';
            document.getElementById('settingsView').style.display = 'none';

            // Preenche versão atual
            const versaoAtual = chrome.runtime.getManifest().version;
            const pillVersao = document.getElementById('sobreVersaoAtual');
            if (pillVersao) pillVersao.textContent = `Versão ${versaoAtual}`;

            // Mostra última checagem salva se existir
            chrome.storage.local.get(['dadosAtualizacao'], (result) => {
                const dados = result.dadosAtualizacao;
                if (dados && dados.ultimaChecagem) {
                    const rowChecagem = document.getElementById('sobreUltimaChecagem');
                    const valChecagem = document.getElementById('sobreChecagemValor');
                    if (rowChecagem) rowChecagem.style.display = 'flex';
                    if (valChecagem) valChecagem.textContent = dados.ultimaChecagem;
                }
            });

            sobreView.style.display = 'block';
            btnSobre.title = 'Fechar Sobre';
            btnSobre.style.opacity = '0.5';
        } else {
            fecharSobre();
        }
    });
}

function fecharSobre() {
    const sobreView = document.getElementById('sobreView');
    const btnSobre = document.getElementById('btnSobre');
    if (sobreView) sobreView.style.display = 'none';
    if (btnSobre) {
        btnSobre.title = 'Sobre / Versão';
        btnSobre.style.opacity = '';
    }
    document.getElementById('mainView').style.display = 'block';
    // Reseta o resultado da verificação
    const resultEl = document.getElementById('sobreResult');
    if (resultEl) { resultEl.style.display = 'none'; resultEl.className = 'sobre-result'; }
    const iconEl = document.getElementById('verificarIcon');
    const textoEl = document.getElementById('verificarTexto');
    if (iconEl) iconEl.textContent = '🔍';
    if (textoEl) textoEl.textContent = 'Verificar Atualizações';
    const btnVer = document.getElementById('btnVerificarAtualizacao');
    if (btnVer) btnVer.disabled = false;
}

// Botão "Verificar Atualizações" dentro do Sobre
if (document.getElementById('btnVerificarAtualizacao')) {
    document.getElementById('btnVerificarAtualizacao').addEventListener('click', () => {
        const iconEl = document.getElementById('verificarIcon');
        const textoEl = document.getElementById('verificarTexto');
        const resultEl = document.getElementById('sobreResult');
        const btnVer = document.getElementById('btnVerificarAtualizacao');

        // Estado: carregando
        iconEl.innerHTML = '<span class="spin-inline">⟳</span>';
        textoEl.textContent = 'Verificando...';
        btnVer.disabled = true;
        resultEl.style.display = 'none';
        resultEl.className = 'sobre-result';

        chrome.runtime.sendMessage({ action: 'verificarAtualizacaoManual' }, (response) => {
            btnVer.disabled = false;
            iconEl.textContent = '🔍';
            textoEl.textContent = 'Verificar Atualizações';

            if (chrome.runtime.lastError || !response) {
                resultEl.className = 'sobre-result erro';
                resultEl.innerHTML = '<div class="sobre-result-title">⚠️ Erro ao verificar</div>Verifique sua conexão com a internet.';
                resultEl.style.display = 'block';
                return;
            }

            // Atualiza última checagem na UI
            if (response.ultimaChecagem) {
                const rowChecagem = document.getElementById('sobreUltimaChecagem');
                const valChecagem = document.getElementById('sobreChecagemValor');
                if (rowChecagem) rowChecagem.style.display = 'flex';
                if (valChecagem) valChecagem.textContent = response.ultimaChecagem;
            }

            if (response.erro) {
                resultEl.className = 'sobre-result erro';
                resultEl.innerHTML = `<div class="sobre-result-title">⚠️ Erro ao verificar</div>${response.erro}`;
            } else if (!response.temAtualizacao) {
                resultEl.className = 'sobre-result atualizado';
                resultEl.innerHTML = `<div class="sobre-result-title">✅ Você já possui a versão mais recente!</div><span style="font-size:10px; opacity:0.8;">Versão atual: v${response.versaoAtual}</span>`;
            } else {
                const notasPreview = response.notas
                    ? response.notas.substring(0, 200) + (response.notas.length > 200 ? '...' : '')
                    : '';
                const updateUrl = chrome.runtime.getURL('update.html');
                resultEl.className = 'sobre-result tem-update';
                resultEl.innerHTML = `
                    <div class="sobre-result-title">✨ Nova versão v${response.versaoNova} disponível!</div>
                    ${notasPreview ? `<div class="sobre-result-notas">${notasPreview}</div>` : ''}
                    <button class="btn-saiba-mais" id="sobreSaibaMais">🔗 Ver Detalhes e Baixar</button>
                `;
                resultEl.style.display = 'block';
                const btnSaibaMais = document.getElementById('sobreSaibaMais');
                if (btnSaibaMais) {
                    btnSaibaMais.addEventListener('click', () => {
                        chrome.tabs.create({ url: updateUrl });
                    });
                }
            }
            resultEl.style.display = 'block';
        });
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
        
        if (document.getElementById('prefShowPlaylist')) {
            currentSettings.showPlaylist = document.getElementById('prefShowPlaylist').checked;
        }
        
        if (document.getElementById('bibliaCor')) {
            currentSettings.bibliaGlobalCor = document.getElementById('bibliaCor').value;
            currentSettings.bibliaGlobalZoom = parseInt(document.getElementById('bibliaZoom').value) || 100;
        }

        if (document.getElementById('prefMemorizarMidia')) {
            currentSettings.prefMemorizarMidia = document.getElementById('prefMemorizarMidia').checked;
        }

        if (document.getElementById('configFrequenciaUpdate')) {
            currentSettings.prefFrequenciaAtualizacao = parseInt(document.getElementById('configFrequenciaUpdate').value) || 3;
        }

        if (document.getElementById('timeCor')) {
            currentSettings.timeGlobalCor = document.getElementById('timeCor').value;
            currentSettings.timeGlobalTamanho = parseFloat(document.getElementById('timeTamanho').value) || 8;
            currentSettings.timeGlobalAlinhamento = document.getElementById('timeAlinhamento').value;
        }

        // Salva o tema selecionado
        const themeRadio = document.querySelector('input[name="themeMode"]:checked');
        if (themeRadio) {
            currentSettings.themeMode = themeRadio.value;
            aplicarTema(currentSettings.themeMode);
        }

        chrome.storage.local.set({ "projetorSettings": currentSettings });
        
        aplicarVisibilidadeControles();
        atualizarVisibilidadePlaylist();

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

/**
 * Verifica se já existe um telão aberto e válido.
 * @param {Function} onLivre   - chamado se NÃO há telão ativo (pode abrir novo)
 * @param {Function} onOcupado - chamado se JÁ há telão ativo (recebe o tabId)
 */
function verificarTelaoAberto(onLivre, onOcupado) {
    chrome.storage.local.get(['projetorTabId'], (result) => {
        const tabId = result.projetorTabId;
        if (!tabId) { onLivre(); return; }

        chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError || !tab) {
                // Aba não existe mais — limpa o registro e libera
                chrome.storage.local.remove('projetorTabId');
                onLivre();
            } else {
                onOcupado(tabId, tab);
            }
        });
    });
}

document.getElementById('abrirProjetor').addEventListener('click', () => {
    verificarTelaoAberto(
        // Livre: abre normalmente
        () => abrirNovaJanela('projetor.html'),
        // Ocupado: avisa e foca o telão existente
        (tabId) => {
            mostrarAviso('ℹ️ Telão já está aberto!');
            // Traz o telão para frente como bônus de UX
            chrome.tabs.get(tabId, (tab) => {
                if (tab && tab.windowId) {
                    chrome.windows.update(tab.windowId, { focused: true });
                }
            });
        }
    );
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

    // Define cor do toast com base no conteúdo
    if (msg.startsWith('✅')) {
        toast.style.background = 'linear-gradient(135deg, #1e8449, #145a32)';
        toast.style.boxShadow = '0 4px 12px rgba(39,174,96,0.4)';
    } else if (msg.startsWith('ℹ️')) {
        toast.style.background = 'linear-gradient(135deg, #0891b2, #0e6f88)';
        toast.style.boxShadow = '0 4px 12px rgba(8,145,178,0.4)';
    } else {
        toast.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
        toast.style.boxShadow = '0 4px 12px rgba(231,76,60,0.4)';
    }

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
        // Remove numerações iniciais do título (ex: "01 - ", "(3) ") igual à playlist
        const tituloLimpo = title.replace(/^\s*[\(\[]?\d{1,3}[\)\]]?\s*[-–—\.:]?\s*/u, '').trim() || title;
        titleLabel.textContent = tituloLimpo;
        titleLabel.title = tituloLimpo; // tooltip com nome completo limpo
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

// ── Lógica de Abas Principais ──
document.querySelectorAll('.main-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.main-tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');

        chrome.storage.session.set({ activeTabId: btn.dataset.target });
    });
});

chrome.storage.session.get(['activeTabId'], (result) => {
    if (result.activeTabId) {
        const btn = document.querySelector(`.main-tab-btn[data-target="${result.activeTabId}"]`);
        if (btn) btn.click();
    }
});

// ── Lógica de Abas das Configurações ──
document.querySelectorAll('.config-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.config-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.config-tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
    });
});

// ── Lógica da Bíblia ──
const booksList = [
    { id: 1, name: "Gênesis" }, { id: 2, name: "Êxodo" }, { id: 3, name: "Levítico" }, { id: 4, name: "Números" }, { id: 5, name: "Deuteronômio" },
    { id: 6, name: "Josué" }, { id: 7, name: "Juízes" }, { id: 8, name: "Rute" }, { id: 9, name: "1 Samuel" }, { id: 10, name: "2 Samuel" },
    { id: 11, name: "1 Reis" }, { id: 12, name: "2 Reis" }, { id: 13, name: "1 Crônicas" }, { id: 14, name: "2 Crônicas" }, { id: 15, name: "Esdras" },
    { id: 16, name: "Neemias" }, { id: 17, name: "Ester" }, { id: 18, name: "Jó" }, { id: 19, name: "Salmos" }, { id: 20, name: "Provérbios" },
    { id: 21, name: "Eclesiastes" }, { id: 22, name: "Cânticos" }, { id: 23, name: "Isaías" }, { id: 24, name: "Jeremias" }, { id: 25, name: "Lamentações" },
    { id: 26, name: "Ezequiel" }, { id: 27, name: "Daniel" }, { id: 28, name: "Oséias" }, { id: 29, name: "Joel" }, { id: 30, name: "Amós" },
    { id: 31, name: "Obadias" }, { id: 32, name: "Jonas" }, { id: 33, name: "Miquéias" }, { id: 34, name: "Naum" }, { id: 35, name: "Habacuque" },
    { id: 36, name: "Sofonias" }, { id: 37, name: "Ageu" }, { id: 38, name: "Zacarias" }, { id: 39, name: "Malaquias" },
    { id: 40, name: "Mateus" }, { id: 41, name: "Marcos" }, { id: 42, name: "Lucas" }, { id: 43, name: "João" }, { id: 44, name: "Atos" },
    { id: 45, name: "Romanos" }, { id: 46, name: "1 Coríntios" }, { id: 47, name: "2 Coríntios" }, { id: 48, name: "Gálatas" }, { id: 49, name: "Efésios" },
    { id: 50, name: "Filipenses" }, { id: 51, name: "Colossenses" }, { id: 52, name: "1 Tessalonicenses" }, { id: 53, name: "2 Tessalonicenses" },
    { id: 54, name: "1 Timóteo" }, { id: 55, name: "2 Timóteo" }, { id: 56, name: "Tito" }, { id: 57, name: "Filemom" }, { id: 58, name: "Hebreus" },
    { id: 59, name: "Tiago" }, { id: 60, name: "1 Pedro" }, { id: 61, name: "2 Pedro" }, { id: 62, name: "1 João" }, { id: 63, name: "2 João" },
    { id: 64, name: "3 João" }, { id: 65, name: "Judas" }, { id: 66, name: "Apocalipse" }
];

function popularLivrosBiblia() {
    const select = document.getElementById('bibliaLivro');
    if(!select) return;
    
    const optgroupAT = document.createElement('optgroup');
    optgroupAT.label = "Antigo Testamento";
    
    const optgroupNT = document.createElement('optgroup');
    optgroupNT.label = "Novo Testamento";

    booksList.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name; // Apenas o nome para a busca nativa por teclado funcionar
        
        if (b.id <= 39) {
            optgroupAT.appendChild(opt);
        } else {
            optgroupNT.appendChild(opt);
        }
    });

    select.appendChild(optgroupAT);
    select.appendChild(optgroupNT);
}
popularLivrosBiblia();

// Estado da Sessão (somente o que é temporário na aba atual)
let estadoBiblia = { versao: 'NVIPT', livro: 1, capitulo: 1, versiculo: '1', agrupar: 1 };
let bibliaVersesList = [];
let bibliaCurrentIndex = 0;
let bibliaBookName = "";
let bibliaChapter = "";
let bibliaTranslation = "";

chrome.storage.session.get(['estadoBiblia', 'bibliaPaginacao'], (result) => {
    if (result.estadoBiblia) estadoBiblia = result.estadoBiblia;
    
    if(document.getElementById('bibliaVersao')) document.getElementById('bibliaVersao').value = estadoBiblia.versao;
    if(document.getElementById('bibliaLivro')) document.getElementById('bibliaLivro').value = estadoBiblia.livro;
    if(document.getElementById('bibliaCapitulo')) document.getElementById('bibliaCapitulo').value = estadoBiblia.capitulo;
    if(document.getElementById('bibliaVersiculo')) document.getElementById('bibliaVersiculo').value = estadoBiblia.versiculo;
    if(document.getElementById('bibliaAgrupar') && estadoBiblia.agrupar) document.getElementById('bibliaAgrupar').value = estadoBiblia.agrupar;
    
    if(document.getElementById('bibliaZoomRapido')) {
        // Usa o zoom rápido da sessão ou recai para o global se for a primeira vez
        document.getElementById('bibliaZoomRapido').value = estadoBiblia.zoomRapido || currentSettings.bibliaGlobalZoom || 100;
    }

    if (result.bibliaPaginacao) {
        bibliaVersesList = result.bibliaPaginacao.list || [];
        bibliaCurrentIndex = result.bibliaPaginacao.index || 0;
        bibliaBookName = result.bibliaPaginacao.bookName || "";
        bibliaChapter = result.bibliaPaginacao.chapter || "";
        bibliaTranslation = result.bibliaPaginacao.translation || "";
        atualizarPaginacaoUI();
    }
});

function salvarEstadoPaginacao() {
    chrome.storage.session.set({
        bibliaPaginacao: {
            list: bibliaVersesList,
            index: bibliaCurrentIndex,
            bookName: bibliaBookName,
            chapter: bibliaChapter,
            translation: bibliaTranslation
        }
    });
}

if (document.getElementById('projetarBiblia')) {
    document.getElementById('projetarBiblia').addEventListener('click', async () => {
        const translation = document.getElementById('bibliaVersao').value;
        const bookId = parseInt(document.getElementById('bibliaLivro').value);
        const chapter = document.getElementById('bibliaCapitulo').value;
        const verseStr = document.getElementById('bibliaVersiculo').value.trim();
        const agrupar = parseInt(document.getElementById('bibliaAgrupar').value) || 1;
        const zoomRapido = parseInt(document.getElementById('bibliaZoomRapido').value) || currentSettings.bibliaGlobalZoom || 100;

        // Salvar na sessão
        chrome.storage.session.set({
            estadoBiblia: { versao: translation, livro: bookId, capitulo: chapter, versiculo: verseStr, agrupar: agrupar, zoomRapido: zoomRapido }
        });

        const bookObj = booksList.find(b => b.id === bookId);
        
        // Agora suporta apenas um versículo (ou seja, início = fim = valor)
        let verseStart = parseInt(verseStr) || 1;

        const urlApi = `https://bolls.life/get-chapter/${translation}/${bookId}/${chapter}/`;

        const btn = document.getElementById('projetarBiblia');
        const oldText = btn.innerHTML;
        btn.innerHTML = '<span>⏳ Buscando...</span>';

        try {
            const response = await fetch(urlApi);
            if (!response.ok) throw new Error('Falha na API');
            const data = await response.json();
            
            if (data.length === 0) {
                mostrarAviso("⚠️ Versículos não encontrados.");
                return;
            }

            let startIndex = 0;
            const index = data.findIndex(v => v.verse >= verseStart);
            if (index !== -1) startIndex = index;

            bibliaVersesList = data; // Guardamos o capítulo todo
            bibliaCurrentIndex = startIndex;
            bibliaBookName = bookObj.name;
            bibliaChapter = chapter;
            bibliaTranslation = translation;

            salvarEstadoPaginacao();
            atualizarPaginacaoUI();
            enviarVersiculoAtualParaProjetor();
        } catch (e) {
            console.error("Erro na busca da Bíblia:", e);
            mostrarAviso("⚠️ Erro ao buscar versículo.");
        } finally {
            btn.innerHTML = oldText;
        }
    });
}

function atualizarPaginacaoUI() {
    const container = document.getElementById('containerPaginacao');
    if (bibliaVersesList.length > 1) {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

if (document.getElementById('btnVersiculoAnterior')) {
    document.getElementById('btnVersiculoAnterior').addEventListener('click', () => {
        const agrupar = parseInt(document.getElementById('bibliaAgrupar').value) || 1;
        if (bibliaCurrentIndex > 0) {
            bibliaCurrentIndex = Math.max(bibliaCurrentIndex - agrupar, 0);
            salvarEstadoPaginacao();
            enviarVersiculoAtualParaProjetor();
        }
    });
    
    document.getElementById('btnVersiculoProximo').addEventListener('click', () => {
        const agrupar = parseInt(document.getElementById('bibliaAgrupar').value) || 1;
        if (bibliaCurrentIndex + agrupar < bibliaVersesList.length) {
            bibliaCurrentIndex += agrupar;
            salvarEstadoPaginacao();
            enviarVersiculoAtualParaProjetor();
        }
    });
}

// Quando o usuário muda a cor ou o zoom na UI e já tem algo projetando
if (document.getElementById('bibliaZoomRapido')) {
    document.getElementById('bibliaZoomRapido').addEventListener('input', () => {
        estadoBiblia.zoomRapido = document.getElementById('bibliaZoomRapido').value;
        chrome.storage.session.set({ estadoBiblia: estadoBiblia });
        if (bibliaVersesList.length > 0) enviarVersiculoAtualParaProjetor();
    });
}

if (document.getElementById('btnResetBiblia')) {
    document.getElementById('btnResetBiblia').addEventListener('click', () => {
        // Limpa inputs
        document.getElementById('bibliaCor').value = '#ffffff';
        document.getElementById('bibliaZoom').value = 100;
        if(document.getElementById('bibliaZoomRapido')) document.getElementById('bibliaZoomRapido').value = 100;
        
        // Atualiza configurações globais
        currentSettings.bibliaGlobalCor = '#ffffff';
        currentSettings.bibliaGlobalZoom = 100;
        chrome.storage.local.set({ "projetorSettings": currentSettings });
        
        // Atualiza sessão
        estadoBiblia.zoomRapido = 100;
        chrome.storage.session.set({ estadoBiblia: estadoBiblia });
        
        if (bibliaVersesList.length > 0) enviarVersiculoAtualParaProjetor();
    });
}

function enviarVersiculoAtualParaProjetor() {
    if (bibliaVersesList.length === 0) return;
    
    const agrupar = parseInt(document.getElementById('bibliaAgrupar').value) || 1;
    const end = Math.min(bibliaCurrentIndex + agrupar, bibliaVersesList.length);
    const versesToDisplay = bibliaVersesList.slice(bibliaCurrentIndex, end);
    
    const htmlContent = versesToDisplay.map(v => `<span class="verse-num">${v.verse}</span> ${v.text}`).join(' ');
    
    let refText = `${bibliaBookName} ${bibliaChapter}:${versesToDisplay[0].verse}`;
    if (versesToDisplay.length > 1) {
        refText += `-${versesToDisplay[versesToDisplay.length - 1].verse}`;
    }

    // A cor agora é estritamente a global
    const cor = currentSettings.bibliaGlobalCor || '#ffffff';
    // O zoom projetado vem do zoom rápido (que por sua vez inicia igual ao global)
    const zoom = document.getElementById('bibliaZoomRapido') ? document.getElementById('bibliaZoomRapido').value : (currentSettings.bibliaGlobalZoom || 100);

    // Remove o sufixo "PT" ou números do código da versão (ex: "NVIPT" → "NVI", "ARC09" → "ARC")
    const versaoExibida = bibliaTranslation.replace(/(PT|\d+)$/, '');

    projetarTextoBiblia(htmlContent, refText, versaoExibida, cor, zoom);
}

// Botão: Encerrar Apresentação da Bíblia (escurece tela sem fechar a janela)
if (document.getElementById('encerrarBiblia')) {
    document.getElementById('encerrarBiblia').addEventListener('click', () => {
        chrome.storage.local.get(['projetorTabId'], (result) => {
            const tabId = result.projetorTabId;
            if (tabId) {
                chrome.tabs.sendMessage(tabId, { action: 'encerrarBiblia' },
                    () => { void chrome.runtime.lastError; }); // silencia se aba não responder
            }
        });
    });
}

function projetarTextoBiblia(htmlContent, referencia, versao, cor, zoom) {
    const bibliaUrl = chrome.runtime.getURL('projetor_biblia.html');
    
    chrome.storage.local.get(["projetorTabId"], (result) => {
        const tabId = result.projetorTabId;
        
        if (tabId) {
            chrome.tabs.get(tabId, (tab) => {
                if (chrome.runtime.lastError || !tab) {
                    abrirNovaJanelaBiblia(bibliaUrl, htmlContent, referencia, versao, cor, zoom);
                    return;
                }
                
                if (!tab.url.includes('projetor_biblia.html')) {
                    chrome.tabs.update(tabId, { url: bibliaUrl }, (updatedTab) => {
                        chrome.tabs.onUpdated.addListener(function listener(tId, changeInfo) {
                            if (tId === tabId && changeInfo.status === 'complete') {
                                chrome.tabs.onUpdated.removeListener(listener);
                                enviarDadosBiblia(tabId, htmlContent, referencia, versao, cor, zoom);
                            }
                        });
                    });
                } else {
                    enviarDadosBiblia(tabId, htmlContent, referencia, versao, cor, zoom);
                }
            });
        } else {
            abrirNovaJanelaBiblia(bibliaUrl, htmlContent, referencia, versao, cor, zoom);
        }
    });
}

function enviarDadosBiblia(tabId, htmlContent, referencia, versao, cor, zoom) {
    chrome.tabs.sendMessage(tabId, {
        action: "showBibleVerse",
        htmlContent: htmlContent,
        referencia: referencia,
        versao: versao,
        cor: cor,
        zoom: zoom
    });
}

function abrirNovaJanelaBiblia(url, htmlContent, referencia, versao, cor, zoom) {
    let [width, height] = currentSettings.windowSize.split('x').map(Number);
    if (!width) width = 1280;
    if (!height) height = 720;

    let createData = { url: url, type: 'popup', width: width, height: height };

    const onWindowCreated = (window) => {
        if (chrome.runtime.lastError) return;
        if (window && window.tabs && window.tabs.length > 0) {
            const tabId = window.tabs[0].id;
            chrome.storage.local.set({ "projetorTabId": tabId });
            
            if (currentSettings.openFullscreen) {
                chrome.windows.update(window.id, { state: "fullscreen" });
            }
            
            chrome.tabs.onUpdated.addListener(function listener(tId, changeInfo) {
                if (tId === tabId && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    enviarDadosBiblia(tabId, htmlContent, referencia, versao, cor, zoom);
                }
            });
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

// ── Lógica do Módulo de Mídia ──

// Estado do módulo de mídia (sessão apenas)
let midiaList = []; // Array de { name, dataUrl }
let midiaCurrentIndex = -1;
let midiaZoom = 1.0;
let midiaRotation = 0;

// Restaura sessão de mídia (lista e índice)
chrome.storage.local.get(['midiaState'], (result) => {
    if (result.midiaState) {
        midiaList = result.midiaState.list || [];
        midiaCurrentIndex = result.midiaState.currentIndex !== undefined ? result.midiaState.currentIndex : -1;
        midiaZoom = result.midiaState.zoom || 1.0;
        midiaRotation = result.midiaState.rotation || 0;

        if (document.getElementById('midiaZoomSlider')) {
            document.getElementById('midiaZoomSlider').value = Math.round(midiaZoom * 100);
            document.getElementById('midiaZoomLabel').textContent = Math.round(midiaZoom * 100) + '%';
        }
        reconstruirGaleria();
    }
});

function salvarMidiaState() {
    chrome.storage.local.set({
        midiaState: {
            list: midiaList,
            currentIndex: midiaCurrentIndex,
            zoom: midiaZoom,
            rotation: midiaRotation
        }
    });
}

function reconstruirGaleria() {
    const gallery = document.getElementById('midiaGallery');
    if (!gallery) return;
    gallery.innerHTML = '';
    midiaList.forEach((item, idx) => adicionarItemGaleria(item, idx));
    atualizarSelecaoGaleria();
}

function adicionarItemGaleria(item, idx) {
    const gallery = document.getElementById('midiaGallery');
    if (!gallery) return;

    const div = document.createElement('div');
    div.className = 'gallery-item';
    div.dataset.index = idx;

    const img = document.createElement('img');
    img.src = item.dataUrl;
    img.alt = item.name;
    img.title = item.name;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '✕';
    removeBtn.title = 'Remover imagem';
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        midiaList.splice(idx, 1);
        if (midiaCurrentIndex >= midiaList.length) midiaCurrentIndex = midiaList.length - 1;
        salvarMidiaState();
        reconstruirGaleria();
    });

    div.appendChild(img);
    div.appendChild(removeBtn);

    div.addEventListener('click', () => {
        midiaCurrentIndex = idx;
        midiaZoom = 1.0;
        midiaRotation = 0;
        if (document.getElementById('midiaZoomSlider')) {
            document.getElementById('midiaZoomSlider').value = 100;
            document.getElementById('midiaZoomLabel').textContent = '100%';
        }
        salvarMidiaState();
        atualizarSelecaoGaleria();
        projetarMidiaAtual();
    });

    gallery.appendChild(div);
}

function atualizarSelecaoGaleria() {
    const items = document.querySelectorAll('#midiaGallery .gallery-item');
    items.forEach((item, idx) => {
        item.classList.toggle('active', idx === midiaCurrentIndex);
    });
}

function carregarArquivos(files) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    let loaded = 0;
    imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const item = { name: file.name, dataUrl: e.target.result };
            const idx = midiaList.length;
            midiaList.push(item);
            adicionarItemGaleria(item, idx);
            loaded++;
            if (loaded === imageFiles.length) {
                salvarMidiaState();
            }
        };
        reader.readAsDataURL(file);
    });
}

// Botão: Selecionar Imagem(ns)
if (document.getElementById('midiaSelectFiles')) {
    document.getElementById('midiaSelectFiles').addEventListener('click', () => {
        document.getElementById('midiaFileInput').click();
    });
    document.getElementById('midiaFileInput').addEventListener('change', (e) => {
        carregarArquivos(e.target.files);
        e.target.value = ''; // reseta para permitir reselecionar os mesmos arquivos
    });
}

// Botão: Selecionar Pasta
if (document.getElementById('midiaSelectFolder')) {
    document.getElementById('midiaSelectFolder').addEventListener('click', () => {
        document.getElementById('midiaFolderInput').click();
    });
    document.getElementById('midiaFolderInput').addEventListener('change', (e) => {
        carregarArquivos(e.target.files);
        e.target.value = '';
    });
}

// Função auxiliar de confirmação customizada
function showConfirm(title, message, onConfirm) {
    const overlay = document.getElementById('confirmModalOverlay');
    if (!overlay) {
        if (confirm(message)) onConfirm();
        return;
    }
    const titleEl = document.getElementById('confirmModalTitle');
    const msgEl = document.getElementById('confirmModalMessage');
    const btnCancel = document.getElementById('btnConfirmCancel');
    const btnOk = document.getElementById('btnConfirmOk');

    titleEl.textContent = title;
    msgEl.textContent = message;
    
    // Cleanup de listeners anteriores clonando os botões
    const newBtnCancel = btnCancel.cloneNode(true);
    const newBtnOk = btnOk.cloneNode(true);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
    btnOk.parentNode.replaceChild(newBtnOk, btnOk);

    newBtnCancel.addEventListener('click', () => overlay.style.display = 'none');
    newBtnOk.addEventListener('click', () => {
        overlay.style.display = 'none';
        if (onConfirm) onConfirm();
    });

    overlay.style.display = 'flex';
}

// Botão: Limpar Todas as Imagens
if (document.getElementById('midiaLimparTudo')) {
    document.getElementById('midiaLimparTudo').addEventListener('click', () => {
        showConfirm("Limpar Imagens", "Tem certeza que deseja limpar todas as imagens carregadas?", () => {
            midiaList = [];
            midiaCurrentIndex = -1;
            document.getElementById('midiaGallery').innerHTML = '';
            salvarMidiaState();
            // Encerrar a apresentação de mídia se houver algo rolando
            chrome.storage.local.get(['projetorTabId'], (result) => {
                const tabId = result.projetorTabId;
                if (tabId) {
                    chrome.tabs.sendMessage(tabId, { action: 'encerrarMidia' }, () => { void chrome.runtime.lastError; });
                }
            });
        });
    });
}

// Botão: Anterior
if (document.getElementById('midiaAnterior')) {
    document.getElementById('midiaAnterior').addEventListener('click', () => {
        if (midiaList.length === 0) return;
        midiaCurrentIndex = (midiaCurrentIndex - 1 + midiaList.length) % midiaList.length;
        salvarMidiaState();
        atualizarSelecaoGaleria();
        projetarMidiaAtual();
    });
}

// Botão: Próximo
if (document.getElementById('midiaProximo')) {
    document.getElementById('midiaProximo').addEventListener('click', () => {
        if (midiaList.length === 0) return;
        midiaCurrentIndex = (midiaCurrentIndex + 1) % midiaList.length;
        salvarMidiaState();
        atualizarSelecaoGaleria();
        projetarMidiaAtual();
    });
}

// Botão: Girar Esquerda
if (document.getElementById('midiaGirarEsq')) {
    document.getElementById('midiaGirarEsq').addEventListener('click', () => {
        midiaRotation = (midiaRotation - 90 + 360) % 360;
        salvarMidiaState();
        enviarTransformacaoMidia();
    });
}

// Botão: Girar Direita
if (document.getElementById('midiaGirarDir')) {
    document.getElementById('midiaGirarDir').addEventListener('click', () => {
        midiaRotation = (midiaRotation + 90) % 360;
        salvarMidiaState();
        enviarTransformacaoMidia();
    });
}

// Botão: Reset Transformação
if (document.getElementById('midiaResetTransform')) {
    document.getElementById('midiaResetTransform').addEventListener('click', () => {
        midiaZoom = 1.0;
        midiaRotation = 0;
        if (document.getElementById('midiaZoomSlider')) {
            document.getElementById('midiaZoomSlider').value = 100;
            document.getElementById('midiaZoomLabel').textContent = '100%';
        }
        salvarMidiaState();
        enviarTransformacaoMidia();
    });
}

// Slider de Zoom
if (document.getElementById('midiaZoomSlider')) {
    document.getElementById('midiaZoomSlider').addEventListener('input', (e) => {
        midiaZoom = parseInt(e.target.value) / 100;
        document.getElementById('midiaZoomLabel').textContent = e.target.value + '%';
        salvarMidiaState();
        enviarTransformacaoMidia();
    });
}

// Botão: Encerrar Apresentação (escurece tela, não fecha a janela)
if (document.getElementById('midiaRemoverTelao')) {
    document.getElementById('midiaRemoverTelao').addEventListener('click', () => {
        chrome.storage.local.get(['projetorTabId'], (result) => {
            const tabId = result.projetorTabId;
            if (tabId) {
                chrome.tabs.sendMessage(tabId, { action: 'encerrarMidia' },
                    () => { void chrome.runtime.lastError; }); // silencia se aba não responder
            }
        });
        midiaCurrentIndex = -1;
        salvarMidiaState();
        atualizarSelecaoGaleria();
    });
}

// Botões de Zoom + e -
function atualizarZoomMidia(novoValorPercent) {
    const slider = document.getElementById('midiaZoomSlider');
    const label = document.getElementById('midiaZoomLabel');
    const valor = Math.min(300, Math.max(50, novoValorPercent));
    midiaZoom = valor / 100;
    if (slider) slider.value = valor;
    if (label) label.textContent = valor + '%';
    salvarMidiaState();
    enviarTransformacaoMidia();
}

if (document.getElementById('midiaZoomMais')) {
    document.getElementById('midiaZoomMais').addEventListener('click', () => {
        const atual = Math.round(midiaZoom * 100);
        atualizarZoomMidia(atual + 10);
    });
}

if (document.getElementById('midiaZoomMenos')) {
    document.getElementById('midiaZoomMenos').addEventListener('click', () => {
        const atual = Math.round(midiaZoom * 100);
        atualizarZoomMidia(atual - 10);
    });
}

function enviarTransformacaoMidia() {
    chrome.storage.local.get(['projetorTabId'], (result) => {
        const tabId = result.projetorTabId;
        if (!tabId) return;
        chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError || !tab) {
                chrome.storage.local.remove('projetorTabId');
                return;
            }
            if (!tab.url || !tab.url.includes('projetor_midia.html')) return; // Só envia se for a tela de mídia
            chrome.tabs.sendMessage(tabId, {
                action: 'updateMidiaTransform',
                zoom: midiaZoom,
                rotation: midiaRotation
            }, () => { void chrome.runtime.lastError; }); // silencia erro se aba fechou
        });
    });
}

function projetarMidiaAtual() {
    if (midiaCurrentIndex < 0 || midiaCurrentIndex >= midiaList.length) return;
    const item = midiaList[midiaCurrentIndex];
    const midiaUrl = chrome.runtime.getURL('projetor_midia.html');

    chrome.storage.local.get(['projetorTabId'], (result) => {
        const tabId = result.projetorTabId;

        const enviarImagem = (tId, tentativa = 1) => {
            if (tentativa > 5) return; // Limite de tentativas para evitar loop infinito
            chrome.tabs.sendMessage(tId, {
                action: 'showMidia',
                dataUrl: item.dataUrl,
                zoom: midiaZoom,
                rotation: midiaRotation
            }, () => {
                if (chrome.runtime.lastError) {
                    // Listener ainda não está pronto, aguarda e tenta de novo
                    setTimeout(() => enviarImagem(tId, tentativa + 1), 300);
                }
            });
        };

        if (tabId) {
            chrome.tabs.get(tabId, (tab) => {
                if (chrome.runtime.lastError || !tab) {
                    // Aba inválida, abre nova
                    chrome.storage.local.remove('projetorTabId');
                    abrirNovaMidiaTab(midiaUrl, enviarImagem);
                    return;
                }

                if (!tab.url.includes('projetor_midia.html')) {
                    // Aba existente tem outra página (ex: youtube ou biblia), atualiza ela
                    chrome.tabs.update(tabId, { url: midiaUrl }, (updatedTab) => {
                        chrome.tabs.onUpdated.addListener(function listener(tId, changeInfo) {
                            if (tId === tabId && changeInfo.status === 'complete') {
                                chrome.tabs.onUpdated.removeListener(listener);
                                enviarImagem(tabId);
                            }
                        });
                    });
                } else {
                    enviarImagem(tabId);
                }
            });
        } else {
            abrirNovaMidiaTab(midiaUrl, enviarImagem);
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// Módulo de Playlist do YouTube
// ═══════════════════════════════════════════════════════════════

// Estado em memória (sincronizado com chrome.storage.session)
let ytPlaylist = [];         // Array de { id, title }
let ytPlaylistIndex = -1;    // Índice do vídeo em reprodução (-1 = nenhum)
let ytPlaylistAtivo = false; // true após o 1.º vídeo ser projetado

// ── Utilitários ────────────────────────────────────────────────

/** Remove numerações comuns no início do título (ex: "01. ", "(3) ", "03 - ") */
function limparTituloVideo(titulo) {
    return titulo
        .replace(/^\s*[\(\[]?\d{1,3}[\)\]]?\s*[-–—\.:]?\s*/u, '') // "01 - " / "(1) " etc.
        .trim();
}

/** Salva o estado atual da playlist na sessão do navegador */
function salvarPlaylistSession() {
    chrome.storage.session.set({
        ytPlaylist: ytPlaylist,
        ytPlaylistIndex: ytPlaylistIndex,
        ytPlaylistAtivo: ytPlaylistAtivo
    });
}

/** Atualiza a contagem e visibilidade do bloco da playlist */
function atualizarVisibilidadePlaylist() {
    const container = document.getElementById('playlistContainer');
    const count = document.getElementById('playlistCount');
    const btnAdicionar = document.getElementById('btnAdicionarPlaylist');
    const btnProjetar = document.getElementById('enviarVideo');

    if (currentSettings.showPlaylist === false) {
        if (container) container.style.display = 'none';
        if (btnAdicionar) btnAdicionar.style.display = 'none';
        if (btnProjetar) btnProjetar.classList.add('btn-solo');
        return;
    }
    
    // Se a configuração permite e o projetor foi ativado
    if (btnAdicionar && ytPlaylistAtivo) {
        btnAdicionar.style.display = 'flex';
        if (btnProjetar) btnProjetar.classList.remove('btn-solo');
    } else {
        if (btnProjetar) btnProjetar.classList.add('btn-solo');
    }

    if (!container) return;

    if (ytPlaylist.length > 0) {
        container.style.display = 'block';
        if (count) count.textContent = `${ytPlaylist.length} item${ytPlaylist.length > 1 ? 's' : ''}`;
    } else {
        container.style.display = 'none';
    }
}

/** Renderiza todos os itens da lista no HTML */
function renderizarPlaylist() {
    const lista = document.getElementById('playlistList');
    if (!lista) return;
    lista.innerHTML = '';

    ytPlaylist.forEach((item, idx) => {
        const li = document.createElement('li');
        li.className = 'playlist-item' + (idx === ytPlaylistIndex ? ' playing' : '');

        // Indicador (▶ tocando / índice)
        const indicador = document.createElement('span');
        indicador.className = 'playlist-item-indicator';
        indicador.textContent = idx === ytPlaylistIndex ? '▶' : (idx + 1);
        indicador.setAttribute('aria-label', idx === ytPlaylistIndex ? 'Reproduzindo' : `Faixa ${idx + 1}`);

        // Título com tooltip completo
        const titulo = document.createElement('span');
        titulo.className = 'playlist-item-title';
        titulo.textContent = item.title;
        titulo.title = item.title; // tooltip nativo do navegador (nome completo)

        // Ações
        const acoes = document.createElement('div');
        acoes.className = 'playlist-item-actions';

        // Botão Play
        const btnPlay = document.createElement('button');
        btnPlay.className = 'pl-btn pl-play';
        btnPlay.textContent = '▶';
        btnPlay.title = 'Reproduzir este vídeo';
        btnPlay.setAttribute('id', `pl-play-${idx}`);
        btnPlay.addEventListener('click', () => tocarItemPlaylist(idx));

        // Botão Mover para cima
        const btnUp = document.createElement('button');
        btnUp.className = 'pl-btn pl-up';
        btnUp.textContent = '↑';
        btnUp.title = 'Mover para cima';
        btnUp.setAttribute('id', `pl-up-${idx}`);
        btnUp.disabled = idx === 0;
        btnUp.style.opacity = idx === 0 ? '0.3' : '';
        btnUp.addEventListener('click', () => moverItemPlaylist(idx, -1));

        // Botão Mover para baixo
        const btnDown = document.createElement('button');
        btnDown.className = 'pl-btn pl-down';
        btnDown.textContent = '↓';
        btnDown.title = 'Mover para baixo';
        btnDown.setAttribute('id', `pl-down-${idx}`);
        btnDown.disabled = idx === ytPlaylist.length - 1;
        btnDown.style.opacity = idx === ytPlaylist.length - 1 ? '0.3' : '';
        btnDown.addEventListener('click', () => moverItemPlaylist(idx, 1));

        // Botão Deletar
        const btnDel = document.createElement('button');
        btnDel.className = 'pl-btn pl-del';
        btnDel.textContent = '✕';
        btnDel.title = 'Remover da lista';
        btnDel.setAttribute('id', `pl-del-${idx}`);
        btnDel.addEventListener('click', () => removerItemPlaylist(idx));

        acoes.appendChild(btnPlay);
        acoes.appendChild(btnUp);
        acoes.appendChild(btnDown);
        acoes.appendChild(btnDel);

        li.appendChild(indicador);
        li.appendChild(titulo);
        li.appendChild(acoes);
        lista.appendChild(li);
    });

    atualizarVisibilidadePlaylist();
}

// ── Ações da Playlist ───────────────────────────────────────────

/** Toca um item específico da playlist no projetor */
function tocarItemPlaylist(idx) {
    if (idx < 0 || idx >= ytPlaylist.length) return;
    const item = ytPlaylist[idx];
    const watchUrl = `https://www.youtube.com/watch?v=${item.id}`;

    chrome.storage.local.get(['projetorTabId'], (result) => {
        const tabId = result.projetorTabId;
        if (tabId) {
            chrome.tabs.update(tabId, { url: watchUrl }, () => {
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

    ytPlaylistIndex = idx;
    salvarPlaylistSession();
    renderizarPlaylist();
}

/** Adiciona o vídeo atual (da aba ativa do YouTube) à playlist */
async function adicionarVideoPlaylist() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !tab.url.includes('youtube.com/watch')) {
        mostrarAviso('⚠️ Nenhum vídeo do YouTube ativo para adicionar!');
        return;
    }

    const url = new URL(tab.url);
    const videoId = url.searchParams.get('v');
    if (!videoId) {
        mostrarAviso('⚠️ Não foi possível identificar o ID do vídeo.');
        return;
    }

    if (ytPlaylist.some(item => item.id === videoId)) {
        mostrarAviso('ℹ️ Este vídeo já está na lista de reprodução.');
        return;
    }

    const tituloRaw = tab.title ? tab.title.replace(/ - YouTube$/, '').trim() : videoId;
    const tituloBom = limparTituloVideo(tituloRaw);

    if (ytPlaylistIndex < 0) {
        const projetorTabId = await new Promise(res =>
            chrome.storage.local.get(['projetorTabId'], r => res(r.projetorTabId || null))
        );

        if (projetorTabId) {
            const projetorTab = await new Promise(res =>
                chrome.tabs.get(projetorTabId, t => res(chrome.runtime.lastError ? null : t))
            );

            if (projetorTab && projetorTab.url && projetorTab.url.includes('youtube.com/watch')) {
                const projUrl = new URL(projetorTab.url);
                const projVideoId = projUrl.searchParams.get('v');

                if (projVideoId && projVideoId !== videoId) {
                    const jaExiste = ytPlaylist.findIndex(item => item.id === projVideoId);
                    if (jaExiste >= 0) {
                        ytPlaylistIndex = jaExiste;
                    } else {
                        const projTitulo = limparTituloVideo(
                            (currentSettings.lastVideoTitle || projVideoId).replace(/ - YouTube$/, '').trim()
                        );
                        ytPlaylist.push({ id: projVideoId, title: projTitulo });
                        ytPlaylistIndex = ytPlaylist.length - 1;
                    }
                } else if (projVideoId && projVideoId === videoId) {
                    ytPlaylistIndex = ytPlaylist.length;
                }
            }
        }
    }

    ytPlaylist.push({ id: videoId, title: tituloBom });
    salvarPlaylistSession();
    renderizarPlaylist();
    mostrarAviso('✅ Adicionado à lista de reprodução!');
}

/** Remove um item da playlist pelo índice */
function removerItemPlaylist(idx) {
    if (idx < 0 || idx >= ytPlaylist.length) return;

    ytPlaylist.splice(idx, 1);

    // Ajusta o índice atual após remoção
    if (ytPlaylist.length === 0) {
        ytPlaylistIndex = -1;
    } else if (ytPlaylistIndex >= ytPlaylist.length) {
        ytPlaylistIndex = ytPlaylist.length - 1;
    } else if (idx < ytPlaylistIndex) {
        ytPlaylistIndex--;
    }

    salvarPlaylistSession();
    renderizarPlaylist();
    // Se a lista ficou vazia, o atualizarVisibilidadePlaylist já oculta o bloco
}

/** Move um item da playlist para cima ou para baixo */
function moverItemPlaylist(idx, direcao) {
    const novoIdx = idx + direcao;
    if (novoIdx < 0 || novoIdx >= ytPlaylist.length) return;

    // Troca os itens de posição
    [ytPlaylist[idx], ytPlaylist[novoIdx]] = [ytPlaylist[novoIdx], ytPlaylist[idx]];

    // Acompanha o índice atual se um dos movidos for o que está tocando
    if (ytPlaylistIndex === idx) {
        ytPlaylistIndex = novoIdx;
    } else if (ytPlaylistIndex === novoIdx) {
        ytPlaylistIndex = idx;
    }

    salvarPlaylistSession();
    renderizarPlaylist();
}

/** Avança automaticamente para o próximo vídeo da playlist */
function avancarPlaylist() {
    if (ytPlaylist.length === 0 || ytPlaylistIndex < 0) return;
    const proximo = ytPlaylistIndex + 1;
    if (proximo < ytPlaylist.length) {
        tocarItemPlaylist(proximo);
    }
    // Se era o último, não faz nada — a lista permanece visível
}

// ── Inicialização: restaura estado da sessão ───────────────────

chrome.storage.session.get(['ytPlaylist', 'ytPlaylistIndex', 'ytPlaylistAtivo'], (result) => {
    if (result.ytPlaylist) ytPlaylist = result.ytPlaylist;
    if (result.ytPlaylistIndex !== undefined) ytPlaylistIndex = result.ytPlaylistIndex;
    if (result.ytPlaylistAtivo !== undefined) ytPlaylistAtivo = result.ytPlaylistAtivo;

    atualizarVisibilidadePlaylist();

    // Reconstrói a lista se houver itens na sessão
    renderizarPlaylist();
});

// ── Botão: Adicionar à Playlist ────────────────────────────────

if (document.getElementById('btnAdicionarPlaylist')) {
    document.getElementById('btnAdicionarPlaylist').addEventListener('click', adicionarVideoPlaylist);
}

// ── Habilita o botão de playlist quando o projetor inicia ─────
// Sobrepõe o listener original do enviarVideo para acionar a playlist após projetar
const _btnEnviarVideo = document.getElementById('enviarVideo');
if (_btnEnviarVideo) {
    _btnEnviarVideo.addEventListener('click', () => {
        // Aguarda um instante para o vídeo iniciar, depois habilita o botão
        setTimeout(() => {
            ytPlaylistAtivo = true;
            salvarPlaylistSession();
            atualizarVisibilidadePlaylist();
        }, 800);
    });
}

// ── Escuta confirmação de avanço de playlist vinda do background ─────
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'playlistAdvanced') {
        // O background já atualizou o índice na session e navegou o vídeo.
        // Só precisamos refletir o novo estado na UI do popup.
        ytPlaylistIndex = request.newIndex;
        renderizarPlaylist();
    }
    // videoEnded ainda pode chegar quando não há playlist ativa (background o repassa)
    // — nesse caso não há nada a fazer no popup.
});

// ── FIM do Módulo de Playlist ──────────────────────────────────

function abrirNovaMidiaTab(url, onReady) {
    let [width, height] = currentSettings.windowSize.split('x').map(Number);
    if (!width) width = 1280;
    if (!height) height = 720;

    let createData = { url: url, type: 'popup', width: width, height: height };

    const onWindowCreated = (window) => {
        if (chrome.runtime.lastError || !window || !window.tabs || window.tabs.length === 0) return;
        const tabId = window.tabs[0].id;
        chrome.storage.local.set({ 'projetorTabId': tabId });

        if (currentSettings.openFullscreen) {
            chrome.windows.update(window.id, { state: 'fullscreen' });
        }

        chrome.tabs.onUpdated.addListener(function listener(tId, changeInfo) {
            if (tId === tabId && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                onReady(tabId);
            }
        });
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

// ═══════════════════════════════════════════════════════════════
// Módulo Time (Relógio/Cronômetro)
// ═══════════════════════════════════════════════════════════════

let timeIsPlaying = false;

function updateTimePlayPauseBtn() {
    const icon = document.getElementById('iconTimePlayPause');
    const text = document.getElementById('textTimePlayPause');
    if (!icon || !text) return;
    if (timeIsPlaying) {
        icon.textContent = '⏸';
        text.textContent = 'Pausar';
    } else {
        icon.textContent = '▶';
        text.textContent = 'Iniciar';
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'timeTick') {
        const display = document.getElementById('timeFeedbackDisplay');
        if (display) display.textContent = message.timeStr;
    }
});

function saveTimeState() {
    const estadoTime = {
        exibirRelogio: document.getElementById('timeExibirRelogio') ? document.getElementById('timeExibirRelogio').checked : true,
        modo: document.getElementById('timeModo') ? document.getElementById('timeModo').value : 'nenhum',
        minutos: document.getElementById('timeMinutos') ? document.getElementById('timeMinutos').value : 5,
        segundos: document.getElementById('timeSegundos') ? document.getElementById('timeSegundos').value : 0,
        textoLivre: document.getElementById('timeTextoLivre') ? document.getElementById('timeTextoLivre').value : '',
        isPlaying: timeIsPlaying
    };
    chrome.storage.session.set({ estadoTime: estadoTime });
}

chrome.storage.session.get(['estadoTime'], (result) => {
    if (result.estadoTime) {
        if (document.getElementById('timeExibirRelogio')) document.getElementById('timeExibirRelogio').checked = result.estadoTime.exibirRelogio;
        if (document.getElementById('timeModo')) {
            document.getElementById('timeModo').value = result.estadoTime.modo;
            const timerGroup = document.getElementById('timeTimerGroup');
            const controlsGrid = document.getElementById('timeControlsGrid');
            if (result.estadoTime.modo === 'timer') {
                if (timerGroup) timerGroup.style.display = 'flex';
            } else {
                if (timerGroup) timerGroup.style.display = 'none';
            }
            if (result.estadoTime.modo !== 'nenhum') {
                if (controlsGrid) controlsGrid.style.display = 'flex';
            } else {
                if (controlsGrid) controlsGrid.style.display = 'none';
            }
        }
        if (document.getElementById('timeMinutos')) document.getElementById('timeMinutos').value = result.estadoTime.minutos;
        if (document.getElementById('timeSegundos')) document.getElementById('timeSegundos').value = result.estadoTime.segundos;
        if (document.getElementById('timeTextoLivre')) document.getElementById('timeTextoLivre').value = result.estadoTime.textoLivre;
        timeIsPlaying = result.estadoTime.isPlaying || false;
        updateTimePlayPauseBtn();
    }
});

if (document.getElementById('timeExibirRelogio')) {
    document.getElementById('timeExibirRelogio').addEventListener('change', saveTimeState);
}
if (document.getElementById('timeMinutos')) {
    document.getElementById('timeMinutos').addEventListener('input', saveTimeState);
}
if (document.getElementById('timeSegundos')) {
    document.getElementById('timeSegundos').addEventListener('input', saveTimeState);
}
if (document.getElementById('timeTextoLivre')) {
    document.getElementById('timeTextoLivre').addEventListener('input', saveTimeState);
}
if (document.getElementById('timeModo')) {
    document.getElementById('timeModo').addEventListener('change', (e) => {
        const timerGroup = document.getElementById('timeTimerGroup');
        const controlsGrid = document.getElementById('timeControlsGrid');
        if (e.target.value === 'timer') {
            if (timerGroup) timerGroup.style.display = 'flex';
        } else {
            if (timerGroup) timerGroup.style.display = 'none';
        }
        if (e.target.value !== 'nenhum') {
            if (controlsGrid) controlsGrid.style.display = 'flex';
        } else {
            if (controlsGrid) controlsGrid.style.display = 'none';
        }
        timeIsPlaying = false;
        updateTimePlayPauseBtn();
        saveTimeState();
    });
}

if (document.getElementById('btnTimePlayPause')) {
    document.getElementById('btnTimePlayPause').addEventListener('click', () => {
        timeIsPlaying = !timeIsPlaying;
        updateTimePlayPauseBtn();
        saveTimeState();
        chrome.storage.local.get(['projetorTabId'], (result) => {
            const tabId = result.projetorTabId;
            if (tabId) {
                chrome.tabs.sendMessage(tabId, { action: timeIsPlaying ? 'playTime' : 'pauseTime' }, () => { void chrome.runtime.lastError; });
            }
        });
    });
}

if (document.getElementById('btnTimeReset')) {
    document.getElementById('btnTimeReset').addEventListener('click', () => {
        timeIsPlaying = false;
        updateTimePlayPauseBtn();
        saveTimeState();
        chrome.storage.local.get(['projetorTabId'], (result) => {
            const tabId = result.projetorTabId;
            if (tabId) {
                chrome.tabs.sendMessage(tabId, { action: 'resetTime' }, () => { void chrome.runtime.lastError; });
            }
        });
    });
}

if (document.getElementById('projetarTime')) {
    document.getElementById('projetarTime').addEventListener('click', () => {
        const exibirRelogio = document.getElementById('timeExibirRelogio').checked;
        const modo = document.getElementById('timeModo').value;
        const minutos = document.getElementById('timeMinutos').value;
        const segundos = document.getElementById('timeSegundos').value;
        const textoLivre = document.getElementById('timeTextoLivre').value;
        
        const cor = currentSettings.timeGlobalCor || '#ffffff';
        const tamanho = currentSettings.timeGlobalTamanho || 8;
        const alinhamento = currentSettings.timeGlobalAlinhamento || 'center';
        
        const config = {
            action: 'showTime',
            exibirRelogio,
            modo,
            minutos,
            segundos,
            textoLivre,
            cor,
            tamanho,
            alinhamento,
            iniciarDoZero: true
        };
        
        timeIsPlaying = false;
        updateTimePlayPauseBtn();
        saveTimeState();
        
        projetarConfigTime(config);
    });
}

if (document.getElementById('encerrarTime')) {
    document.getElementById('encerrarTime').addEventListener('click', () => {
        chrome.storage.local.get(['projetorTabId'], (result) => {
            const tabId = result.projetorTabId;
            if (tabId) {
                chrome.tabs.sendMessage(tabId, { action: 'encerrarTime' }, () => { void chrome.runtime.lastError; });
            }
        });
    });
}

if (document.getElementById('btnResetTime')) {
    document.getElementById('btnResetTime').addEventListener('click', () => {
        document.getElementById('timeCor').value = '#ffffff';
        document.getElementById('timeTamanho').value = 8;
        document.getElementById('timeAlinhamento').value = 'center';
        
        currentSettings.timeGlobalCor = '#ffffff';
        currentSettings.timeGlobalTamanho = 8;
        currentSettings.timeGlobalAlinhamento = 'center';
        chrome.storage.local.set({ "projetorSettings": currentSettings });
        
        // Atualizar telão se estiver aberto
        chrome.storage.local.get(['projetorTabId'], (result) => {
            const tabId = result.projetorTabId;
            if (tabId) {
                const config = {
                    action: 'showTime',
                    exibirRelogio: document.getElementById('timeExibirRelogio').checked,
                    modo: document.getElementById('timeModo').value,
                    minutos: document.getElementById('timeMinutos').value,
                    segundos: document.getElementById('timeSegundos').value,
                    textoLivre: document.getElementById('timeTextoLivre').value,
                    cor: currentSettings.timeGlobalCor,
                    tamanho: currentSettings.timeGlobalTamanho,
                    alinhamento: currentSettings.timeGlobalAlinhamento,
                    iniciarDoZero: false
                };
                chrome.tabs.sendMessage(tabId, config, () => { void chrome.runtime.lastError; });
            }
        });
    });
}

function projetarConfigTime(config) {
    const urlTime = chrome.runtime.getURL('projetor_time.html');
    
    chrome.storage.local.get(["projetorTabId"], (result) => {
        const tabId = result.projetorTabId;
        
        if (tabId) {
            chrome.tabs.get(tabId, (tab) => {
                if (chrome.runtime.lastError || !tab) {
                    abrirNovaJanelaTime(urlTime, config);
                    return;
                }
                
                if (!tab.url.includes('projetor_time.html')) {
                    chrome.tabs.update(tabId, { url: urlTime }, (updatedTab) => {
                        chrome.tabs.onUpdated.addListener(function listener(tId, changeInfo) {
                            if (tId === tabId && changeInfo.status === 'complete') {
                                chrome.tabs.onUpdated.removeListener(listener);
                                chrome.tabs.sendMessage(tabId, config);
                            }
                        });
                    });
                } else {
                    chrome.tabs.sendMessage(tabId, config);
                }
            });
        } else {
            abrirNovaJanelaTime(urlTime, config);
        }
    });
}

function abrirNovaJanelaTime(url, config) {
    let [width, height] = currentSettings.windowSize.split('x').map(Number);
    if (!width) width = 1280;
    if (!height) height = 720;

    let createData = { url: url, type: 'popup', width: width, height: height };

    const onWindowCreated = (window) => {
        if (chrome.runtime.lastError) return;
        if (window && window.tabs && window.tabs.length > 0) {
            const tabId = window.tabs[0].id;
            chrome.storage.local.set({ "projetorTabId": tabId });
            
            if (currentSettings.openFullscreen) {
                chrome.windows.update(window.id, { state: "fullscreen" });
            }
            
            chrome.tabs.onUpdated.addListener(function listener(tId, changeInfo) {
                if (tId === tabId && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    chrome.tabs.sendMessage(tabId, config);
                }
            });
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