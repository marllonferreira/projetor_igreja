// projetor_midia.js - Script de projeção de imagens
// Recebe mensagens do popup via chrome.runtime.onMessage

let currentZoom = 1.0;
let currentRotation = 0;

function aplicarTransformacao() {
    const img = document.getElementById('midiaImg');
    if (img) {
        img.style.transform = `scale(${currentZoom}) rotate(${currentRotation}deg)`;
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'showMidia') {
        const img = document.getElementById('midiaImg');
        if (!img) return;

        // Reseta transformações ao carregar nova imagem
        currentZoom = message.zoom || 1.0;
        currentRotation = message.rotation || 0;

        img.style.opacity = '1';
        img.src = message.dataUrl;
        aplicarTransformacao();
        sendResponse({ ok: true });
    }

    if (message.action === 'updateMidiaTransform') {
        if (message.zoom !== undefined) currentZoom = message.zoom;
        if (message.rotation !== undefined) currentRotation = message.rotation;
        aplicarTransformacao();
        sendResponse({ ok: true });
    }

    if (message.action === 'encerrarMidia') {
        // Escurece a tela sem fechar a janela — fica aguardando
        const img = document.getElementById('midiaImg');
        if (img) {
            img.style.opacity = '0';
        }
        sendResponse({ ok: true });
    }
});
