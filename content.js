function applyProjectorRules() {
    if (!chrome.runtime?.id) return; // Proteção contra Extension context invalidated

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
            
            // console.log("Projetor Igreja [DEBUG]: Aba principal detectada.");
            
            // Regras da tela principal (Mudo Automático / Pausar Automático)
            if (response && response.projectorIsOpen && (response.ytMudoAutoMain || response.ytAutoplayBlockMain)) {
                aplicarRegrasTelaPrincipal(response);
            }
        }
    });
}

// Aplica mudo/pause na tela principal de forma agressiva e precoce.
// Usa MutationObserver para detectar o vídeo ASSIM que ele é inserido no DOM,
// sem depender do yt-navigate-finish (que chega tarde demais).
function aplicarRegrasTelaPrincipal(response) {
    // Configura os ouvintes de intenção do usuário apenas uma vez
    if (!window._projetorIgrejaMainBlockSetup) {
        window._projetorIgrejaMainBlockSetup = true;
        window._projetorIgrejaUserIntent = false;

        // Ao clicar no player, assumimos intenção de reproduzir
        document.addEventListener('pointerdown', (e) => {
            if (e.target.closest('#movie_player')) {
                window._projetorIgrejaUserIntent = true;
            }
        }, { capture: true });

        // Ao usar atalhos de teclado, assumimos intenção de reproduzir
        document.addEventListener('keydown', (e) => {
            const tag = (e.target.tagName || '').toUpperCase();
            if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
            window._projetorIgrejaUserIntent = true;
        }, { capture: true });

        // Reseta a intenção ao navegar para um novo vídeo
        window.addEventListener('yt-navigate-start', () => {
            window._projetorIgrejaUserIntent = false;
        });
    }

    // Função central de enforcement
    function enforcar(video) {
        if (response.ytMudoAutoMain && !video.muted) {
            video.muted = true;
            // Clica no botão de mudo para sincronizar a interface visual do YouTube.
            // O botão mostra 'Ativar som' quando o vídeo NÃO está mudo (clique = mutar).
            const muteBtn = document.querySelector('.ytp-mute-button');
            if (muteBtn) {
                const label = muteBtn.getAttribute('data-title-no-tooltip') || muteBtn.getAttribute('title') || '';
                // Clica apenas quando o botão mostra a ação de MUTAR (i.e. vídeo não está mudo)
                if (!label.toLowerCase().includes('ativar') && !label.toLowerCase().includes('unmute')) {
                    muteBtn.click();
                }
            }
            // console.log(`Projetor Igreja [DEBUG]: Mudo aplicado + botão sincronizado.`);
        }

        if (response.ytAutoplayBlockMain) {
            if (!video.paused && !window._projetorIgrejaUserIntent) {
                video.pause();
                // console.log(`Projetor Igreja [DEBUG]: Pause aplicado.`);
            }

            // Impede reproduções automáticas acidentais (ex: redimensionamento da janela)
            if (!video._projetorIgrejaPlayListener) {
                video._projetorIgrejaPlayListener = true;
                video.addEventListener('play', () => {
                    if (window._projetorIgrejaUserIntent) return;

                    // Consulta o estado real no momento do play, pois o usuário pode ter fechado o projetor
                    if (chrome.runtime?.id) {
                        chrome.runtime.sendMessage({ action: "isProjector" }, (currentState) => {
                            if (chrome.runtime.lastError || !currentState) return;
                            
                            // Só bloqueia se o projetor AINDA estiver aberto e a opção ativa
                            if (currentState.projectorIsOpen && currentState.ytAutoplayBlockMain) {
                                if (!window._projetorIgrejaUserIntent) {
                                    video.pause();
                                }
                            }
                        });
                    }
                });
            }
        }
    }

    // 1. Se o vídeo já existe na página, age imediatamente
    const videoExistente = document.querySelector('video');
    if (videoExistente) {
        // Usa um pequeno setInterval para continuar pressionando por 1.5s
        // (o YouTube pode reverter o estado nos primeiros instantes)
        let t = 0;
        const iv = setInterval(() => {
            const v = document.querySelector('video');
            if (v) enforcar(v);
            if (++t > 30) clearInterval(iv);
        }, 50);
        return;
    }

    // 2. Se o vídeo ainda não existe, observa o DOM e age assim que aparecer
    const observer = new MutationObserver(() => {
        const v = document.querySelector('video');
        if (!v) return;
        observer.disconnect();
        // Força assim que nasce
        enforcar(v);
        // Continua pressionando por 1.5s para vencer a reversão do YouTube
        let t = 0;
        const iv = setInterval(() => {
            const v2 = document.querySelector('video');
            if (v2) enforcar(v2);
            if (++t > 30) clearInterval(iv);
        }, 50);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    // Cancela o observer após 5 segundos se o vídeo nunca aparecer
    setTimeout(() => observer.disconnect(), 5000);
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
    if (isAdNoTelao()) {
        video.muted = true;
        video.volume = 0;
        return;
    }
    // Guarda contra "Extension context invalidated" (ocorre quando a extensão é recarregada
    // mas os listeners antigos ainda estão ativos na aba do YouTube)
    if (!chrome.runtime?.id) return;

    // Desmuta garantidamente no telão do projetor
    if (video.muted) {
        video.muted = false;
        const muteBtn = document.querySelector('.ytp-mute-button');
        if (muteBtn) {
            const label = (muteBtn.getAttribute('data-title-no-tooltip') || muteBtn.getAttribute('title') || '').toLowerCase();
            if (label.includes('ativar') || label.includes('unmute')) {
                muteBtn.click();
            }
        }
    }

    // Aplicação síncrona imediata com o valor em cache (padrão 1.0 = 100%)
    if (Math.abs(video.volume - ultimoVolumeConfigurado) > 0.01) {
        video.volume = ultimoVolumeConfigurado;
    }

    // Validação/Sincronização assíncrona com o storage
    chrome.storage.local.get(['ytVolumeLevel'], (res) => {
        if (!chrome.runtime?.id) return;
        if (isAdNoTelao()) {
            if (video) {
                video.muted = true;
                video.volume = 0;
            }
            return;
        }
        const volSalvo = (res && typeof res.ytVolumeLevel === 'number') ? res.ytVolumeLevel : 1.0;
        ultimoVolumeConfigurado = Math.max(0, Math.min(1.0, volSalvo));
        volumeConfiguradoCarregado = true;
        if (video.muted) {
            video.muted = false;
        }
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
    if (!chrome.runtime?.id) return; // Guarda: extensão pode ter sido recarregada
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

// --- Lógica de Bloqueio/Pulo e Contagem de Anúncios ---
let adMutedOriginalState = null;
let ultimoAdIdentificador = null;
let adSkipClicadoParaEsteAd = false;
let adNumeroAtual = 0;
let ultimoMomentoAdTimestamp = 0;

function isAdNoTelao() {
    if (!document.documentElement.classList.contains('extensao-igreja-projector-active')) return false;
    const player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    if (player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'))) {
        return true;
    }
    return !!document.querySelector('.ytp-ad-player-overlay, .ytp-ad-text, .ytp-ad-simple-ad-badge, .ytp-ad-preview-text, .ytp-ad-module > *');
}

function onVideoEndedEvent() {
    if (!document.documentElement.classList.contains('extensao-igreja-projector-active')) return;

    // Se o evento 'ended' disparou enquanto um anúncio estava ativo ou acabou de pular (últimos 2 segundos),
    // é o término do anúncio, NÃO do vídeo principal do culto!
    if (isAdNoTelao() || ultimoAdIdentificador !== null || (Date.now() - ultimoMomentoAdTimestamp < 2000)) {
        console.log("Projetor Igreja: Evento 'ended' ignorado (término de anúncio, mantendo projeção ativa).");
        return;
    }

    console.log("Projetor Igreja: Vídeo principal finalizado. Blackout ativado.");
    document.documentElement.classList.add('video-finalizado');
    const video = document.querySelector('video');
    if (video) video.pause();

    // Desativa o autoplay nativamente se ainda estiver ligado
    const autoNavBtn = document.querySelector('.ytp-autonav-toggle-button');
    if (autoNavBtn && autoNavBtn.getAttribute('aria-checked') === 'true') {
        autoNavBtn.click();
    }

    // Notifica o popup para avançar a playlist (se houver)
    chrome.runtime.sendMessage({ action: 'videoEnded' }, () => {
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
    video.removeEventListener('ended', onVideoEndedEvent);

    video.addEventListener('play', onVideoPlayEvent);
    video.addEventListener('pause', onVideoPauseEvent);
    video.addEventListener('playing', onVideoPlayingEvent);
    video.addEventListener('volumechange', onVideoVolumeChangeEvent);
    video.addEventListener('canplay', onVideoCanPlayEvent);
    video.addEventListener('ended', onVideoEndedEvent);
}

function onVideoCanPlayEvent() {
    const video = document.querySelector('video');
    if (!video) return;
    if (isAdNoTelao()) {
        video.muted = true;
        video.volume = 0;
        return;
    }
    if (!estaEmFade) {
        aplicarVolumeConfigurado(video);
    }
}

function onVideoPlayEvent() {
    const video = document.querySelector('video');
    if (!video) return;
    if (isAdNoTelao()) {
        video.muted = true;
        video.volume = 0;
        processarAnuncios();
        return;
    }
    // Vídeo principal começou a rodar: remove blackout garantidamente
    document.documentElement.classList.remove('video-finalizado');
    if (!estaEmFade) {
        aplicarVolumeConfigurado(video);
    }
    notificarEstadoVideo({ playing: true });
}

function onVideoPlayingEvent() {
    const video = document.querySelector('video');
    if (!video) return;
    if (isAdNoTelao()) {
        video.muted = true;
        video.volume = 0;
        processarAnuncios();
        return;
    }
    // Vídeo principal rodando: remove blackout
    document.documentElement.classList.remove('video-finalizado');
    if (!estaEmFade) {
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
    if (estaEmFade) return;

    // Se for anúncio no telão, anula instantaneamente qualquer tentativa do player ou anúncio de desmutar
    if (isAdNoTelao()) {
        const video = document.querySelector('video');
        if (video) {
            video.muted = true;
            video.volume = 0;
        }
        return;
    }

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

// Inicializa a lógica de fim de vídeo e observador de anúncios
setupPostVideoLogic();
setupAdObserver();

// Re-inicializa no evento de mudança de página (SPA)
window.addEventListener('yt-navigate-finish', () => {
    document.documentElement.classList.remove('video-finalizado');
    setupPostVideoLogic();
    setupAdObserver();
    applyProjectorRules();
    // Notifica com atraso suave para esperar o título carregar
    setTimeout(() => notificarEstadoVideo(), 300);
    setTimeout(() => notificarEstadoVideo(), 1000);
});

// yt-navigate-start dispara ANTES do yt-navigate-finish, assim que o usuário clica num vídeo.
// Isso permite iniciar o enforcement de mudo/pause ainda mais cedo,
// enquanto o vídeo novo ainda está sendo carregado pela página.
window.addEventListener('yt-navigate-start', () => {
    // Pede ao background de forma assíncrona para saber se deve aplicar regras
    if (!chrome.runtime?.id) return; // Protege contra "Extension context invalidated"
    chrome.runtime.sendMessage({ action: "isProjector" }, (response) => {
        if (chrome.runtime.lastError || !response) return;
        if (!response.isProjector && response.projectorIsOpen &&
            (response.ytMudoAutoMain || response.ytAutoplayBlockMain)) {
            aplicarRegrasTelaPrincipal(response);
        }
    });
});

function registrarLogAd(acao) {
    if (!chrome.runtime?.id) return;

    const data = new Date();
    const timestamp = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR');
    const msg = `[${timestamp}] ${acao}`;
    console.log("Projetor Igreja Log:", msg);
    
    chrome.storage.local.get(['adLogs'], (result) => {
        if (!chrome.runtime?.id) return;
        let logs = result.adLogs || [];
        logs.push(msg);
        if (logs.length > 100) logs.shift(); // Mantém apenas os últimos 100
        chrome.storage.local.set({ adLogs: logs });
    });
}

function processarAnuncios() {
    if (!chrome.runtime?.id) return;
    if (!document.documentElement.classList.contains('extensao-igreja-projector-active')) return;

    // Garante que o observador de mutações esteja acoplado ao player
    setupAdObserver();

    const video = document.querySelector('video');
    const isAdShowing = isAdNoTelao();

    if (isAdShowing) {
        ultimoMomentoAdTimestamp = Date.now();

        // 1. MUTA O ÁUDIO IMEDIATAMENTE COM DUPLA GARANTIA (muted=true E volume=0)
        // Isso elimina 100% de qualquer chance de vazamento de áudio antes de qualquer outra ação
        if (video) {
            if (adMutedOriginalState === null) {
                adMutedOriginalState = video.muted;
            }
            video.muted = true;
            video.volume = 0;
        }

        // 2. Identifica se é um NOVO anúncio (inclusive no caso de múltiplos: "1 de 2" -> "2 de 2")
        const adBadgeTexto = document.querySelector('.ytp-ad-text, .ytp-ad-simple-ad-badge, .ytp-ad-preview-text')?.textContent?.trim() || '';
        const adSrc = video ? (video.currentSrc || video.src || '') : '';
        const adIdentificadorAtual = adSrc + '|' + adBadgeTexto;

        if (adIdentificadorAtual !== ultimoAdIdentificador && adIdentificadorAtual.length > 1) {
            ultimoAdIdentificador = adIdentificadorAtual;
            adSkipClicadoParaEsteAd = false; // Permite pular o novo anúncio assim que o botão surgir

            // Incrementa o contador de anúncios reais no storage
            chrome.storage.local.get(['adCount'], (res) => {
                if (!chrome.runtime?.id) return;
                adNumeroAtual = (res.adCount || 0) + 1;
                chrome.storage.local.set({ adCount: adNumeroAtual });

                const detalheTexto = adBadgeTexto ? ` (${adBadgeTexto})` : '';
                registrarLogAd(`Anúncio #${adNumeroAtual}${detalheTexto} interceptado. Áudio mutado e aceleração ativada.`);
            });
        }

        // 3. Tenta clicar no botão "Pular Anúncio" (Skip Ad) para o anúncio atual
        const skipButtons = document.querySelectorAll('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-text.ytp-ad-skip-button-text');
        if (skipButtons.length > 0 && !adSkipClicadoParaEsteAd) {
            skipButtons.forEach(btn => {
                if (btn && typeof btn.click === 'function') btn.click();
            });
            adSkipClicadoParaEsteAd = true;
            const num = adNumeroAtual > 0 ? `#${adNumeroAtual}` : '';
            registrarLogAd(`Anúncio ${num}: Botão 'Pular Anúncio' acionado com sucesso.`);
        }

        // 4. Para anúncios não-puláveis, acelera ao máximo (16x) e avança para o final
        if (video && !isNaN(video.duration) && video.currentTime < video.duration - 0.2) {
            video.playbackRate = 16.0;
            if (video.duration > 0) {
                video.currentTime = video.duration - 0.1;
            }
        }
    } else {
        // Nenhum anúncio ativo: se havia anúncio rodando antes, restaura velocidade e áudio
        if (ultimoAdIdentificador !== null) {
            ultimoAdIdentificador = null;
            adSkipClicadoParaEsteAd = false;
            ultimoMomentoAdTimestamp = Date.now();
            adMutedOriginalState = null;

            // Remove imediatamente qualquer cortina preta de blackout
            document.documentElement.classList.remove('video-finalizado');

            if (video) {
                if (video.playbackRate !== 1.0) {
                    video.playbackRate = 1.0;
                }
                
                // Desmuta e restaura o volume configurado para o culto
                aplicarVolumeConfigurado(video);

                // Se o vídeo principal tiver ficado pausado após a transição, retoma imediatamente
                if (video.paused && !video.ended) {
                    video.play().catch(() => {});
                }
            }
            registrarLogAd("Anúncios finalizados. Áudio e vídeo do culto restaurados.");
        }
    }

    // Garante que autoplay e legendas continuem desativados no projetor
    desativarAutoplayELegendas();
}

// Observador instantâneo do DOM: detecta a classe .ad-showing ou overlay no exato microssegundo em que é inserida
function setupAdObserver() {
    const player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    if (player && !player._projetorAdObserver) {
        player._projetorAdObserver = true;
        const adObserver = new MutationObserver(() => {
            if (!document.documentElement.classList.contains('extensao-igreja-projector-active')) return;
            if (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting') || isAdNoTelao()) {
                const video = document.querySelector('video');
                if (video) {
                    if (adMutedOriginalState === null) adMutedOriginalState = video.muted;
                    video.muted = true;
                    video.volume = 0;
                }
                processarAnuncios();
            }
        });
        adObserver.observe(player, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true });
    }
}

function initAdSkipper() {
    setupAdObserver();
    // Intervalo de 50ms para varredura contínua de segurança
    setInterval(processarAnuncios, 50);
}

// Inicializa o scanner de anúncios
initAdSkipper();

