// projetor.js - Gerencia a tela inicial de espera / repouso do telão

function atualizarTelaEspera(imagemDataUrl) {
    const imgEl = document.getElementById('espera-img');
    const msgEl = document.getElementById('msg');
    if (!imgEl) return;

    if (imagemDataUrl) {
        imgEl.src = imagemDataUrl;
        imgEl.style.display = 'block';
        setTimeout(() => {
            imgEl.classList.add('show');
        }, 50);
        if (msgEl) msgEl.style.display = 'none';
    } else {
        imgEl.classList.remove('show');
        setTimeout(() => {
            imgEl.style.display = 'none';
            imgEl.src = '';
        }, 400);
        if (msgEl) msgEl.style.display = 'block';
    }
}

// Carrega a imagem salva ao abrir o telão
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['projetorSettings'], (result) => {
        const settings = result.projetorSettings || {};
        if (settings.telaoImagemEspera) {
            atualizarTelaEspera(settings.telaoImagemEspera);
        }
    });
}

// Ouve mensagens de atualização em tempo real vindas do popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateTelaEspera') {
            atualizarTelaEspera(request.imagem);
            sendResponse({ ok: true });
        } else if (request.action === 'updateSettings' && request.settings) {
            atualizarTelaEspera(request.settings.telaoImagemEspera || null);
            sendResponse({ ok: true });
        }
    });
}

// Responde a comandos genéricos de vídeo/janela para evitar erros se enviados do popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "controlVideo") {
            if (request.command === "getVideoState") {
                sendResponse({
                    volume: 1,
                    muted: false,
                    playing: false,
                    currentTime: 0,
                    duration: 0,
                    title: "Telão em Repouso"
                });
                return true;
            } else if (request.command === "fullscreen_toggle") {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                    sendResponse({ fullscreen: true });
                } else {
                    document.exitFullscreen().catch(() => {});
                    sendResponse({ fullscreen: false });
                }
                return true;
            }
        }
    });
}
