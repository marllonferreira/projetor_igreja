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

function mostrarEsperaSeConfigurada() {
    const esperaImg = document.getElementById('espera-img');
    if (esperaImg && esperaImg.src) {
        esperaImg.style.display = 'block';
        setTimeout(() => { esperaImg.classList.add('show'); }, 50);
    }
}

function ocultarEspera() {
    const esperaImg = document.getElementById('espera-img');
    if (esperaImg) {
        esperaImg.classList.remove('show');
        setTimeout(() => { esperaImg.style.display = 'none'; }, 400);
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'showMidia') {
        const img = document.getElementById('midiaImg');
        if (!img) return;

        ocultarEspera();

        // Reseta transformações ao carregar nova imagem
        currentZoom = message.zoom || 1.0;
        currentRotation = message.rotation || 0;

        const updateImage = () => {
            img.src = message.dataUrl;
            aplicarTransformacao();
            setTimeout(() => {
                img.style.opacity = '1';
            }, 50);
        };

        if (img.style.opacity === '1') {
            img.style.opacity = '0';
            setTimeout(updateImage, 400); // aguarda o fade out do CSS
        } else {
            updateImage();
        }

        sendResponse({ ok: true });
    }

    if (message.action === 'updateMidiaTransform') {
        if (message.zoom !== undefined) currentZoom = message.zoom;
        if (message.rotation !== undefined) currentRotation = message.rotation;
        aplicarTransformacao();
        sendResponse({ ok: true });
    }

    if (message.action === 'encerrarMidia') {
        // Escurece a imagem de mídia
        const img = document.getElementById('midiaImg');
        if (img) {
            img.style.opacity = '0';
        }
        // Se houver tela de espera configurada, exibe suavemente
        mostrarEsperaSeConfigurada();
        sendResponse({ ok: true });
    }

    if (message.action === 'updateTelaEspera') {
        const esperaImg = document.getElementById('espera-img');
        const midiaImg = document.getElementById('midiaImg');
        if (esperaImg) {
            if (message.imagem) {
                esperaImg.src = message.imagem;
                if (!midiaImg || midiaImg.style.opacity === '0' || !midiaImg.src) {
                    mostrarEsperaSeConfigurada();
                }
            } else {
                ocultarEspera();
                esperaImg.src = '';
            }
        }
        sendResponse({ ok: true });
    }
});

// Carrega imagem de espera salva ao abrir se houver
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['projetorSettings'], (result) => {
        const settings = result.projetorSettings || {};
        const esperaImg = document.getElementById('espera-img');
        if (esperaImg && settings.telaoImagemEspera) {
            esperaImg.src = settings.telaoImagemEspera;
        }
    });
}
