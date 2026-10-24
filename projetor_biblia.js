chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "showBibleVerse") {
        const container = document.getElementById('conteudoBiblia');
        const textoAlvo = document.getElementById('texto-alvo');
        const referenciaAlvo = document.getElementById('referencia-alvo');
        const versaoAlvo = document.getElementById('versao-alvo');

        const isVisible = container.classList.contains('show');

        const updateContent = () => {
            // Atualiza os dados
            textoAlvo.innerHTML = request.htmlContent;
            referenciaAlvo.textContent = request.referencia;
            versaoAlvo.textContent = request.versao;

            // Aplica cor e zoom
            const baseFontSizeVW = 5.5; // VW
            const zoomFactor = request.zoom ? (request.zoom / 100) : 1;
            
            // Ajuste dinâmico de tamanho de fonte dependendo do tamanho do texto
            const length = textoAlvo.textContent.length;
            let finalFontSize = baseFontSizeVW;
            
            if (length > 300) {
                finalFontSize = 3.5;
            } else if (length > 150) {
                finalFontSize = 4.5;
            }
            
            textoAlvo.style.fontSize = (finalFontSize * zoomFactor) + 'vw';
            textoAlvo.style.color = request.cor || '#ffffff';

            // Mostra suavemente
            setTimeout(() => container.classList.add('show'), 50);
        };

        if (isVisible) {
            container.classList.remove('show');
            setTimeout(updateContent, 400); // Aguarda o fade out
        } else {
            updateContent();
        }

        // Esconde imagem de espera se estiver visível
        const esperaImg = document.getElementById('espera-img');
        if (esperaImg) {
            esperaImg.classList.remove('show');
            setTimeout(() => { esperaImg.style.display = 'none'; }, 400);
        }
    }

    if (request.action === "encerrarBiblia") {
        // Escurece o texto bíblico suavemente
        const container = document.getElementById('conteudoBiblia');
        if (container) container.classList.remove('show');

        // Se houver tela de espera configurada, exibe suavemente
        const esperaImg = document.getElementById('espera-img');
        if (esperaImg && esperaImg.src) {
            esperaImg.style.display = 'block';
            setTimeout(() => { esperaImg.classList.add('show'); }, 50);
        }
        sendResponse({ ok: true });
    }

    if (request.action === "updateSettings" && request.settings) {
        const s = request.settings;
        const container = document.getElementById('conteudoBiblia');
        const textoAlvo = document.getElementById('texto-alvo');
        
        // Se houver versículo exibido, aplica cor e zoom em tempo real
        if (textoAlvo && container && container.classList.contains('show')) {
            if (s.bibliaGlobalCor) {
                textoAlvo.style.color = s.bibliaGlobalCor;
            }
            if (s.bibliaGlobalZoom) {
                const baseFontSizeVW = 5.5;
                const zoomFactor = s.bibliaGlobalZoom / 100;
                const length = textoAlvo.textContent.length;
                let finalFontSize = baseFontSizeVW;
                if (length > 300) finalFontSize = 3.5;
                else if (length > 150) finalFontSize = 4.5;
                textoAlvo.style.fontSize = (finalFontSize * zoomFactor) + 'vw';
            }
        }

        // Atualiza a imagem de espera no cache interno
        const esperaImg = document.getElementById('espera-img');
        if (esperaImg) {
            if (s.telaoImagemEspera) {
                esperaImg.src = s.telaoImagemEspera;
                if (container && !container.classList.contains('show')) {
                    esperaImg.style.display = 'block';
                    setTimeout(() => { esperaImg.classList.add('show'); }, 50);
                }
            } else {
                esperaImg.classList.remove('show');
                setTimeout(() => {
                    esperaImg.style.display = 'none';
                    esperaImg.src = '';
                }, 400);
            }
        }
        sendResponse({ ok: true });
    }
});

// Carrega imagem de espera ao abrir se houver
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['projetorSettings'], (result) => {
        const settings = result.projetorSettings || {};
        const esperaImg = document.getElementById('espera-img');
        if (esperaImg && settings.telaoImagemEspera) {
            esperaImg.src = settings.telaoImagemEspera;
        }
    });
}

// Responde ao controle de vídeo para evitar erros se o popup enviar controles para esta aba
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "controlVideo") {
        if (request.command === "getVideoState") {
            sendResponse({
                volume: 1,
                muted: false,
                playing: false,
                currentTime: 0,
                duration: 0,
                title: "Projeção Bíblica"
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
