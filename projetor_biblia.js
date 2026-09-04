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
    }

    if (request.action === "encerrarBiblia") {
        // Escurece a tela suavemente sem fechar a janela
        const container = document.getElementById('conteudoBiblia');
        if (container) container.classList.remove('show');
        sendResponse({ ok: true });
    }
});

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
