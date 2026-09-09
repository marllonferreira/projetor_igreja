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

            // Desativa autoplay e legendas se estiverem ativos
            desativarAutoplayELegendas();

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
                
                // Aplica e força o volume correto (100% por padrão ou preferência salva)
                aplicarVolumeConfigurado(video);

                if (video.paused) {
                    video.play().catch(() => { });
                }
            }
        } else {
            document.documentElement.classList.remove('extensao-igreja-projector-active');
        }
    });
}

let ultimoVolumeConfigurado = 1.0;
let volumeConfiguradoCarregado = false;

// Carrega preventivamente a preferência ao injetar o script
chrome.storage.local.get(['ytVolumeLevel'], (res) => {
    if (res && typeof res.ytVolumeLevel === 'number') {
        ultimoVolumeConfigurado = Math.max(0, Math.min(1.0, res.ytVolumeLevel));
    }
    volumeConfiguradoCarregado = true;
});

function aplicarVolumeConfigurado(video) {
    if (!video) return;

    // Aplicação síncrona imediata com o valor em cache (padrão 1.0 = 100%)
    if (Math.abs(video.volume - ultimoVolumeConfigurado) > 0.01) {
        video.volume = ultimoVolumeConfigurado;
    }

    // Validação/Sincronização assíncrona com o storage
    chrome.storage.local.get(['ytVolumeLevel'], (res) => {
        const volSalvo = (res && typeof res.ytVolumeLevel === 'number') ? res.ytVolumeLevel : 1.0;
        ultimoVolumeConfigurado = Math.max(0, Math.min(1.0, volSalvo));
        volumeConfiguradoCarregado = true;
        if (Math.abs(video.volume - ultimoVolumeConfigurado) > 0.01) {
            video.volume = ultimoVolumeConfigurado;
        }
        notificarEstadoVideo();
    });
}

function desativarAutoplayELegendas() {
    // 1. Desativa Autoplay nativo
    const autoNavBtn = document.querySelector('.ytp-autonav-toggle-button');
    if (autoNavBtn && autoNavBtn.getAttribute('aria-checked') === 'true') {
        autoNavBtn.click();
    }

    // 2. Desativa Legendas (Closed Captions) se o botão estiver ativo
    const subBtn = document.querySelector('.ytp-subtitles-button');
    if (subBtn && (subBtn.getAttribute('aria-pressed') === 'true' || subBtn.classList.contains('ytp-button-active'))) {
        subBtn.click();
    }
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

// Controle de transição suave de áudio (Fade In / Fade Out)
let fadeAudioTimer = null;
let volumeOriginalPreFade = null;
let fadeTipo = null; // 'in' ou 'out'
let estaEmFade = false; // Flag dedicada para bloquear listeners durante todo o ciclo de fade

function cancelarFadeSeHouver(video) {
    if (fadeAudioTimer) {
        clearInterval(fadeAudioTimer);
        fadeAudioTimer = null;
    }
    estaEmFade = false;
    if (volumeOriginalPreFade !== null && video) {
        video.volume = volumeOriginalPreFade;
        volumeOriginalPreFade = null;
    }
    fadeTipo = null;
}

function executarFadeOutAudio(video, callbackPosFade) {
    cancelarFadeSeHouver(video);

    // Se já estiver mudo ou com volume quase zero ou pausado, executa direto
    if (!video || video.muted || video.volume <= 0.02 || video.paused) {
        if (callbackPosFade) callbackPosFade();
        return;
    }

    estaEmFade = true;
    fadeTipo = 'out';
    volumeOriginalPreFade = video.volume;
    const duracaoMs = 800; // Transição suave de ~800ms
    const intervaloMs = 30;
    const passos = Math.floor(duracaoMs / intervaloMs);
    const decrementoPorPasso = volumeOriginalPreFade / passos;

    fadeAudioTimer = setInterval(() => {
        if (!video) {
            clearInterval(fadeAudioTimer);
            fadeAudioTimer = null;
            estaEmFade = false;
            fadeTipo = null;
            return;
        }

        const novoVol = video.volume - decrementoPorPasso;
        if (novoVol > 0.01) {
            video.volume = Math.max(0, novoVol);
        } else {
            // Chegou ao fim do fade out — mantém estaEmFade=true até callback concluir
            clearInterval(fadeAudioTimer);
            fadeAudioTimer = null;
            fadeTipo = null;
            video.volume = 0;

            if (callbackPosFade) callbackPosFade();
            // Só libera o bloqueio APÓS o callback (pause/stop) ter sido executado
            estaEmFade = false;
        }
    }, intervaloMs);
}

function executarFadeInAudio(video, volumeAlvo, callbackPosFade) {
    // Cancela qualquer fade anterior sem restaurar o volume de uma vez
    if (fadeAudioTimer) {
        clearInterval(fadeAudioTimer);
        fadeAudioTimer = null;
    }
    estaEmFade = true;
    fadeTipo = 'in';

    const alvo = Math.max(0, Math.min(1.0, (typeof volumeAlvo === 'number' && volumeAlvo > 0) ? volumeAlvo : ultimoVolumeConfigurado));
    volumeOriginalPreFade = alvo;

    // Se alvo for mudo ou volume muito baixo, apenas aplica
    if (!video || video.muted || alvo <= 0.02) {
        if (video) video.volume = alvo;
        volumeOriginalPreFade = null;
        estaEmFade = false;
        fadeTipo = null;
        if (callbackPosFade) callbackPosFade();
        return;
    }

    video.volume = 0;
    const duracaoMs = 800; // Transição suave de subida de ~800ms
    const intervaloMs = 30;
    const passos = Math.floor(duracaoMs / intervaloMs);
    const incrementoPorPasso = alvo / passos;

    fadeAudioTimer = setInterval(() => {
        if (!video || video.paused) {
            clearInterval(fadeAudioTimer);
            fadeAudioTimer = null;
            estaEmFade = false;
            fadeTipo = null;
            return;
        }

        const novoVol = video.volume + incrementoPorPasso;
        if (novoVol < alvo - 0.01) {
            video.volume = Math.min(alvo, novoVol);
        } else {
            // Chegou ao volume alvo completo
            clearInterval(fadeAudioTimer);
            fadeAudioTimer = null;
            estaEmFade = false;
            fadeTipo = null;
            video.volume = alvo;
            volumeOriginalPreFade = null;
            if (callbackPosFade) callbackPosFade();
            notificarEstadoVideo();
        }
    }, intervaloMs);
}

// Ouvinte para comandos remotos do Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "controlVideo") {
        const video = document.querySelector('video');

        // Retorna o estado atual do vídeo
        // volume escala direta: 0.0 a 1.0 (100% no popup = 100% no player YouTube)
        if (request.command === "getVideoState") {
            const volAtual = volumeOriginalPreFade !== null ? volumeOriginalPreFade : (video ? video.volume : 1.0);
            sendResponse({
                volume: Math.max(0, Math.min(1, volAtual)),
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
                const volAlvo = volumeOriginalPreFade !== null ? volumeOriginalPreFade : (video.volume > 0.02 ? video.volume : ultimoVolumeConfigurado);
                
                // Cancela qualquer fade anterior mantendo o volume zerado para início suave
                if (fadeAudioTimer) {
                    clearInterval(fadeAudioTimer);
                    fadeAudioTimer = null;
                }
                fadeTipo = null;

                document.documentElement.classList.remove('video-finalizado');
                if (video.muted) video.muted = false;

                // Bloqueia listeners ANTES do play para evitar restauração de volume prematura
                estaEmFade = true;
                video.volume = 0;
                video.play().then(() => {
                    executarFadeInAudio(video, volAlvo);
                }).catch(() => {
                    executarFadeInAudio(video, volAlvo);
                });

                sendResponse({ playing: true });

            } else if (request.command === "pause") {
                // Notifica imediatamente o popup para atualizar o ícone para Play sem delay
                sendResponse({ playing: false });
                executarFadeOutAudio(video, () => {
                    video.pause();
                });

            } else if (request.command === "stop") {
                // Notifica imediatamente o popup para atualizar os botões
                sendResponse({ playing: false });
                executarFadeOutAudio(video, () => {
                    video.pause();
                    if (!video.ended) {
                        video.currentTime = 0;
                    }
                    // No stop restaura o volume de referência para quando iniciar de novo
                    if (volumeOriginalPreFade !== null) {
                        video.volume = volumeOriginalPreFade;
                        volumeOriginalPreFade = null;
                    } else {
                        video.volume = ultimoVolumeConfigurado;
                    }
                    document.documentElement.classList.add('video-finalizado');
                });

            } else if (request.command === "mute_toggle") {
                cancelarFadeSeHouver(video);
                video.muted = !video.muted;
                sendResponse({ muted: video.muted, volume: video.volume });

            } else if (request.command === "volume") {
                cancelarFadeSeHouver(video);
                const novoVol = Math.max(0, Math.min(1.0, request.value));
                if (novoVol > 0) video.muted = false;
                video.volume = novoVol;
                ultimoVolumeConfigurado = novoVol;
                chrome.storage.local.set({ ytVolumeLevel: novoVol });
                sendResponse({ volume: video.volume, muted: video.muted });

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

// Dispara atualização de estado para o popup em tempo real
function notificarEstadoVideo(extra = {}) {
    if (!document.documentElement.classList.contains('extensao-igreja-projector-active')) return;
    const video = document.querySelector('video');
    const volAtual = volumeOriginalPreFade !== null ? volumeOriginalPreFade : (video ? video.volume : 1.0);
    const payload = {
        action: 'videoStateChanged',
        playing: video ? (!video.paused && !video.ended && video.readyState >= 2) : false,
        currentTime: video ? video.currentTime : 0,
        duration: video && !isNaN(video.duration) ? video.duration : 0,
        volume: Math.max(0, Math.min(1, volAtual)),
        muted: video ? video.muted : false,
        title: document.title.replace(/ - YouTube$/, ''),
        ...extra
    };
    chrome.runtime.sendMessage(payload, () => {
        void chrome.runtime.lastError;
    });
}

// Lógica para detectar fim do vídeo e bloquear autoplay
function setupPostVideoLogic() {
    const video = document.querySelector('video');
    if (!video) return;

    // Remove listeners antigos se houver para não duplicar
    video.removeEventListener('play', onVideoPlayEvent);
    video.removeEventListener('pause', onVideoPauseEvent);
    video.removeEventListener('playing', onVideoPlayingEvent);
    video.removeEventListener('volumechange', onVideoVolumeChangeEvent);
    video.removeEventListener('canplay', onVideoCanPlayEvent);

    video.addEventListener('play', onVideoPlayEvent);
    video.addEventListener('pause', onVideoPauseEvent);
    video.addEventListener('playing', onVideoPlayingEvent);
    video.addEventListener('volumechange', onVideoVolumeChangeEvent);
    video.addEventListener('canplay', onVideoCanPlayEvent);

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

        // Notifica o popup para avançar a playlist (se houver)
        chrome.runtime.sendMessage({ action: 'videoEnded' }, () => {
            void chrome.runtime.lastError;
        });
    });
}

function onVideoCanPlayEvent() {
    const video = document.querySelector('video');
    if (video && !estaEmFade) {
        aplicarVolumeConfigurado(video);
    }
}

function onVideoPlayEvent() {
    const video = document.querySelector('video');
    if (video && !estaEmFade) {
        aplicarVolumeConfigurado(video);
    }
    notificarEstadoVideo({ playing: true });
}

function onVideoPlayingEvent() {
    const video = document.querySelector('video');
    if (video && !estaEmFade) {
        aplicarVolumeConfigurado(video);
    }
    notificarEstadoVideo({ playing: true });
}

function onVideoPauseEvent() {
    const video = document.querySelector('video');
    if (video && !video.ended) {
        notificarEstadoVideo({ playing: false });
    }
}

function onVideoVolumeChangeEvent() {
    // Não interfere no volume enquanto um fade estiver em andamento
    if (estaEmFade) return;

    const video = document.querySelector('video');
    if (video) {
        // Se o player do YouTube tentar resetar o volume para um valor arbitrário/baixo
        // diferente da preferência configurada (ex: volume interno de 0.16), restauramos o volume configurado
        if (Math.abs(video.volume - ultimoVolumeConfigurado) > 0.01) {
            video.volume = ultimoVolumeConfigurado;
        }
    }

    notificarEstadoVideo();
}

// Inicializa a lógica de fim de vídeo
setupPostVideoLogic();

// Re-inicializa no evento de mudança de página (SPA)
window.addEventListener('yt-navigate-finish', () => {
    document.documentElement.classList.remove('video-finalizado');
    setupPostVideoLogic();
    applyProjectorRules();
    // Notifica com atraso suave para esperar o título carregar
    setTimeout(() => notificarEstadoVideo(), 300);
    setTimeout(() => notificarEstadoVideo(), 1000);
});

// --- Lógica de Bloqueio/Pulo de Anúncios ---
function registrarLogAd(acao) {
    const data = new Date();
    const timestamp = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR');
    const msg = `[${timestamp}] Ação: ${acao}`;
    console.log("Projetor Igreja Log:", msg);
    
    chrome.storage.local.get(['adLogs'], (result) => {
        let logs = result.adLogs || [];
        logs.push(msg);
        if (logs.length > 100) logs.shift(); // Mantém apenas os últimos 100
        chrome.storage.local.set({ adLogs: logs });
    });
}

let adMutedOriginalState = null;
// Flags para garantir log único por evento de anúncio
let adLogadoDeteccao = false;
let adLogadoSkip = false;
let adLogadoRestauracao = false;

function processarAnuncios() {
    if (!document.documentElement.classList.contains('extensao-igreja-projector-active')) return;

    const video = document.querySelector('video');
    const isAdShowing = document.querySelector('.html5-video-player.ad-showing, .html5-video-player.ad-interrupting, .ytp-ad-player-overlay');

    if (isAdShowing) {
        // Reinicia flag de restauração para o próximo ciclo sem anúncio
        adLogadoRestauracao = false;

        // 1. MUTA O ÁUDIO IMEDIATAMENTE antes de qualquer outra ação
        if (video) {
            if (adMutedOriginalState === null) {
                adMutedOriginalState = video.muted;
            }
            if (!video.muted) {
                video.muted = true;
            }
        }

        // 2. Registro único de detecção/aceleração
        if (!adLogadoDeteccao && video) {
            adLogadoDeteccao = true;
            registrarLogAd("Anúncio detectado. Áudio mutado instantaneamente e reprodução acelerada a 16x.");
        }

        // 3. Tenta clicar no botão "Pular Anúncio" (Skip Ad) — log único por skip
        const skipButtons = document.querySelectorAll('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-text.ytp-ad-skip-button-text');
        if (skipButtons.length > 0 && !adLogadoSkip) {
            skipButtons.forEach(btn => {
                if (btn && typeof btn.click === 'function') btn.click();
            });
            adLogadoSkip = true;
            registrarLogAd("Botão 'Pular Anúncio' encontrado e clicado.");
        }

        // 4. Para anúncios não-puláveis, acelera ao máximo
        if (video && !isNaN(video.duration) && video.currentTime < video.duration - 0.2) {
            video.playbackRate = 16.0;
            // Avança imediatamente para o final se viável
            if (video.duration > 0) {
                video.currentTime = video.duration - 0.1;
            }
        }
    } else {
        // Nenhum anúncio ativo: restaura velocidade e áudio se foram alterados
        if (video) {
            if (video.playbackRate !== 1.0) {
                video.playbackRate = 1.0;
            }
            if (adMutedOriginalState !== null) {
                if (!adLogadoRestauracao) {
                    adLogadoRestauracao = true;
                    registrarLogAd("Anúncio encerrado. Velocidade e áudio restaurados.");
                }
                video.muted = adMutedOriginalState;
                adMutedOriginalState = null;
            }
        }
        // Reseta flags para o próximo anúncio
        adLogadoDeteccao = false;
        adLogadoSkip = false;
    }

    // Garante que autoplay e legendas continuem desativados no projetor
    desativarAutoplayELegendas();
}

function initAdSkipper() {
    // Intervalo de 100ms para interceptar o áudio no milissegundo em que o anúncio tentar carregar
    setInterval(processarAnuncios, 100);
}

// Inicializa o scanner de anúncios
initAdSkipper();

