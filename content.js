function applyProjectorRules() {
    // Pergunta ao background se esta aba é o projetor oficial
    chrome.runtime.sendMessage({ action: "isProjector" }, (response) => {
        if (chrome.runtime.lastError) {
            console.warn("Projetor Igreja: Erro ao comunicar com background.js");
            return;
        }

        if (response && response.isProjector) {
            console.log("Projetor Igreja: Esta aba É o projetor. Aplicando limpeza...");
            document.documentElement.classList.add('extensao-igreja-projector-active');

            // Força o modo cinema se necessário
            const theater = document.querySelector('ytd-watch-flexy[theater]');
            if (!theater) {
                const sizeBtn = document.querySelector('.ytp-size-button');
                if (sizeBtn) sizeBtn.click();
            }

            // Força ativar o áudio e tenta dar play
            const video = document.querySelector('video');
            if (video) {
                // Verifica se está mudo, e se estiver, clica no botão nativo do YouTube
                if (video.muted) {
                    const muteBtn = document.querySelector('.ytp-mute-button');
                    if (muteBtn) {
                        muteBtn.click();
                    } else {
                        video.muted = false;
                    }
                }
                
                // Força o volume interno do YouTube para 50% (que equivale a 100% na escala da extensão)
                video.volume = 0.5;

                if (video.paused) {
                    video.play().catch(() => { });
                }
            }
        } else {
            document.documentElement.classList.remove('extensao-igreja-projector-active');
        }
    });
}

// Ouve eventos de navegação SPA do YouTube
window.addEventListener('yt-navigate-finish', applyProjectorRules);

// Verifica no carregamento inicial
applyProjectorRules();

// MutationObserver para garantir que a classe não seja removida pelo YouTube
const observer = new MutationObserver(() => {
    chrome.runtime.sendMessage({ action: "isProjector" }, (response) => {
        if (response && response.isProjector) {
            if (!document.documentElement.classList.contains('extensao-igreja-projector-active')) {
                document.documentElement.classList.add('extensao-igreja-projector-active');
            }
        }
    });
});
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

// Ouvinte para comandos remotos do Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "controlVideo") {
        const video = document.querySelector('video');

        // Retorna o estado atual do vídeo
        // volume é normalizado: 0.0-1.0 no popup = 0.0-0.5 no video real (fator correto p/ YouTube)
        if (request.command === "getVideoState") {
            sendResponse({
                volume: video ? Math.min(1, video.volume * 2) : 1,  // 0-0.5 → 0-1 para o popup
                muted: video ? video.muted : false,
                playing: video ? (!video.paused && !video.ended && video.readyState >= 2) : false,
                currentTime: video ? video.currentTime : 0,
                duration: video && !isNaN(video.duration) ? video.duration : 0,
                title: document.title.replace(/ - YouTube$/, '')
            });
            return true;
        }

        if (video) {
            if (request.command === "play") {
                document.documentElement.classList.remove('video-finalizado');
                if (video.muted) video.muted = false;
                video.play().catch(() => { });
                sendResponse({ playing: true });

            } else if (request.command === "pause") {
                video.pause();
                sendResponse({ playing: false });

            } else if (request.command === "stop") {
                video.pause();
                video.currentTime = 0;
                document.documentElement.classList.add('video-finalizado');
                sendResponse({ playing: false });

            } else if (request.command === "mute_toggle") {
                video.muted = !video.muted;
                sendResponse({ muted: video.muted, volume: video.volume });

            } else if (request.command === "volume") {
                // Fator 0.5: popup envia 0-1, aplicamos 0-0.5 no vídeo para não estourar o YouTube
                const novoVol = Math.max(0, Math.min(0.5, request.value * 0.5));
                if (novoVol > 0) video.muted = false;
                video.volume = novoVol;
                // Devolve normalizado (0.0-0.5 → 0.0-1.0) para o popup mostrar o % correto
                sendResponse({ volume: Math.min(1, video.volume * 2), muted: video.muted });

            } else if (request.command === "fullscreen_toggle") {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                    sendResponse({ fullscreen: true });
                } else {
                    document.exitFullscreen().catch(() => {});
                    sendResponse({ fullscreen: false });
                }
            }
        }
    }
    return true;
});

// Lógica para detectar fim do vídeo e bloquear autoplay
function setupPostVideoLogic() {
    const video = document.querySelector('video');
    if (!video) return;

    // Detecta o fim do vídeo
    video.addEventListener('ended', () => {
        console.log("Projetor Igreja: Vídeo finalizado. Blackout ativado.");
        document.documentElement.classList.add('video-finalizado');
        // Garante que o player pare
        video.pause();

        // Desativa o autoplay nativamente se ainda estiver ligado
        const autoNavBtn = document.querySelector('.ytp-autonav-toggle-button');
        if (autoNavBtn && autoNavBtn.getAttribute('aria-checked') === 'true') {
            autoNavBtn.click();
        }
    });
}

// Inicializa a lógica de fim de vídeo
setupPostVideoLogic();

// Re-inicializa no evento de mudança de página (SPA)
window.addEventListener('yt-navigate-finish', () => {
    document.documentElement.classList.remove('video-finalizado');
    setupPostVideoLogic();
    applyProjectorRules();
});
