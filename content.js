// ═══════════════════════════════════════════════════════════════════════════════
// PROJETOR IGREJA - MÓDULO DE CORTE DE ANÚNCIOS & CORTINA (PRIORIDADE MÁXIMA)
// ═══════════════════════════════════════════════════════════════════════════════
let modoDimmingAdsAtivo = true;
let isUltimoEstadoAdAtivo = false;
let isAnuncioDeFimDeVideo = false;
let tempoMaximoAtingidoVideoPrincipal = 0;
let duracaoVideoPrincipal = 0;
let adMutedOriginalState = null;
let adLogadoDeteccao = false;
let adLogadoSkip = false;
let adLogadoRestauracao = false;
let adMutationObserver = null;

// Carrega a preferência de escurecimento de anúncios (Modo Cortina)
chrome.storage.local.get(['projetorSettings'], (res) => {
    if (res && res.projetorSettings && typeof res.projetorSettings.prefDimmingAds === 'boolean') {
        modoDimmingAdsAtivo = res.projetorSettings.prefDimmingAds;
    }
});

// Ouve alterações nas configurações em tempo real
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.projetorSettings) {
        const novosSettings = changes.projetorSettings.newValue || {};
        if (typeof novosSettings.prefDimmingAds === 'boolean') {
            modoDimmingAdsAtivo = novosSettings.prefDimmingAds;
            if (!modoDimmingAdsAtivo) {
                aplicarVisualCortina(false);
            } else if (isUltimoEstadoAdAtivo) {
                aplicarVisualCortina(true);
            }
        }
    }
});

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

function verificarSeHaAnuncio() {
    const player = document.querySelector('.html5-video-player') || document.getElementById('movie_player');
    if (!player) return false;
    return player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting');
}

// Corta o áudio com prioridade máxima durante anúncios
function cortarAudioAnuncioImediato() {
    if (!document.documentElement.classList.contains('extensao-igreja-projector-active')) return;
    const video = document.querySelector('video');
    if (video) {
        if (!video.muted) {
            video.muted = true;
        }
        if (video.volume > 0) {
            video.volume = 0;
        }
    }
}

let vigilanciaPosAnuncioTimer = null;

// Verifica se o botão nativo de som do YouTube está exibindo o estado "MUDO"
// (o rótulo exibe 'Ativar som' / 'Unmute' quando está mudo)
function isBotaoMuteDoYouTubeAtivo() {
    const muteBtn = document.querySelector('.ytp-mute-button');
    if (!muteBtn) return false;
    const label = (muteBtn.getAttribute('data-title-no-tooltip') || 
                   muteBtn.getAttribute('title') || 
                   muteBtn.getAttribute('aria-label') || '').toLowerCase();
    return label.includes('ativar') || label.includes('unmute');
}

// Aciona o clique no botão nativo do YouTube se estiver mutado (por label ou estado do vídeo)
function desmutarPlayerNativoYouTubeSeNecessario(video) {
    if (!video) video = document.querySelector('video');
    const muteBtn = document.querySelector('.ytp-mute-button');
    if (!muteBtn) {
        if (video) video.muted = false;
        return false;
    }

    const estaMudoPorLabel = isBotaoMuteDoYouTubeAtivo();
    const estaMudoPorVideo = video && video.muted;

    if (estaMudoPorLabel || estaMudoPorVideo) {
        muteBtn.click();
        return true;
    }
    return false;
}

// Sincroniza e reseta o volume e o estado mudo gravados internamente pelo YouTube no localStorage
function sincronizarStorageYouTube(volumeDesejado) {
    try {
        const rawVol = localStorage.getItem('yt-player-volume');
        let parsed = rawVol ? JSON.parse(rawVol) : null;
        if (!parsed || typeof parsed !== 'object') {
            parsed = { data: {} };
        }
        let data = typeof parsed.data === 'string' ? JSON.parse(parsed.data) : (parsed.data || {});
        data.muted = false;
        if (typeof volumeDesejado === 'number') {
            data.volume = Math.round(volumeDesejado * 100);
        }
        parsed.data = JSON.stringify(data);
        localStorage.setItem('yt-player-volume', JSON.stringify(parsed));
    } catch (e) {
        // Silencioso em caso de restrição de segurança
    }
}

// Limpa qualquer valor mudo salvo no localStorage do YouTube para não herdar mudo entre vídeos/abas
function limparMudoStorageYouTube() {
    sincronizarStorageYouTube(ultimoVolumeConfigurado);
}

// Sincroniza e desmuta com garantia tanto o elemento <video> quanto a interface interna do YouTube
function sincronizarEDesmutarPlayerTelao(video) {
    if (!video) video = document.querySelector('video');
    if (!video) return;
    if (estaEmFade || document.documentElement.classList.contains('video-finalizado')) return;

    // 1. Aciona o clique nativo se o botão ou vídeo estiver mudo
    const clicouParaDesmutar = desmutarPlayerNativoYouTubeSeNecessario(video);

    // 2. Garante o elemento HTML5 desmutado
    if (video.muted) {
        video.muted = false;
    }

    // 3. Aplica o volume configurado
    const vol = (typeof ultimoVolumeConfigurado === 'number' && ultimoVolumeConfigurado > 0) ? ultimoVolumeConfigurado : 1.0;
    video.volume = vol;

    // 4. Sincroniza com a API nativa do player do YouTube se disponível
    const player = document.querySelector('.html5-video-player') || document.getElementById('movie_player');
    if (player) {
        if (typeof player.setVolume === 'function') {
            try { player.setVolume(Math.round(vol * 100)); } catch (e) {}
        }
        if (typeof player.unMute === 'function') {
            try { player.unMute(); } catch (e) {}
        }
    }

    // 5. Limpa storage local do YouTube
    sincronizarStorageYouTube(vol);

    // Se o clique no botão nativo foi acionado, o script interno do YouTube processa o clique
    // assincronamente e tenta impor o volume padrão de fábrica dele (~53%).
    // Reforçamos nos instantes seguintes para garantir que o volume do operador prevaleça sempre.
    if (clicouParaDesmutar) {
        [60, 150, 300].forEach(delay => {
            setTimeout(() => {
                if (video && !estaEmFade && !verificarSeHaAnuncio() && !isUltimoEstadoAdAtivo) {
                    video.volume = vol;
                    if (player && typeof player.setVolume === 'function') {
                        try { player.setVolume(Math.round(vol * 100)); } catch (e) {}
                    }
                    sincronizarStorageYouTube(vol);
                }
            }, delay);
        });
    }
}

// Sentinela persistente pós-anúncio: monitora por até 2.25s e garante que o áudio não seja revertido pelo YouTube
function iniciarVigilanciaPosAnuncio() {
    if (vigilanciaPosAnuncioTimer) {
        clearInterval(vigilanciaPosAnuncioTimer);
        vigilanciaPosAnuncioTimer = null;
    }

    let ciclo = 0;
    const maxCiclos = 15; // 15 * 150ms = 2.25 segundos de garantia persistente

    const executarTick = () => {
        ciclo++;
        if (verificarSeHaAnuncio() || isUltimoEstadoAdAtivo) {
            clearInterval(vigilanciaPosAnuncioTimer);
            vigilanciaPosAnuncioTimer = null;
            return;
        }

        const video = document.querySelector('video');
        if (video) {
            sincronizarEDesmutarPlayerTelao(video);

            // Se o áudio já está ativo e o botão nativo do YouTube não está mais com ícone de mudo
            if (!video.muted && video.volume > 0.05 && !isBotaoMuteDoYouTubeAtivo() && ciclo >= 2) {
                clearInterval(vigilanciaPosAnuncioTimer);
                vigilanciaPosAnuncioTimer = null;
                notificarEstadoVideo({ muted: false, volume: video.volume });
                return;
            }
        }

        if (ciclo >= maxCiclos) {
            clearInterval(vigilanciaPosAnuncioTimer);
            vigilanciaPosAnuncioTimer = null;
            notificarEstadoVideo();
        }
    };

    executarTick();
    vigilanciaPosAnuncioTimer = setInterval(executarTick, 150);
}

function garantirOverlayCortina() {
    let overlay = document.getElementById('projetor-ad-cortina-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'projetor-ad-cortina-overlay';
        (document.body || document.documentElement).appendChild(overlay);
    }
    return overlay;
}

function aplicarVisualCortina(ativa) {
    const overlay = garantirOverlayCortina();
    if (ativa && modoDimmingAdsAtivo) {
        if (!document.documentElement.classList.contains('ad-cortina-ativa')) {
            document.documentElement.classList.add('ad-cortina-ativa');
        }
        if (overlay && !overlay.classList.contains('show')) {
            overlay.classList.add('show');
        }
    } else {
        document.documentElement.classList.remove('ad-cortina-ativa');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }
}

// Processa anúncios em tempo real: áudio mudo instantâneo + cortina + skip rápido
function processarAnuncios() {
    if (!document.documentElement.classList.contains('extensao-igreja-projector-active')) {
        aplicarVisualCortina(false);
        isUltimoEstadoAdAtivo = false;
        return;
    }

    const video = document.querySelector('video');
    const isAdShowing = verificarSeHaAnuncio();

    if (isAdShowing) {
        // 1. CORTE DE ÁUDIO INSTANTÂNEO ANTES DE QUALQUER COISA
        cortarAudioAnuncioImediato();

        // 2. Aplica cortina escura
        aplicarVisualCortina(true);

        adLogadoRestauracao = false;

        // 3. Notifica o popup se o estado acabou de mudar
        if (!isUltimoEstadoAdAtivo) {
            isUltimoEstadoAdAtivo = true;
            notificarEstadoVideo({ isAd: true });

            // Identifica se a publicidade entrou no encerramento do vídeo oficial do culto
            if (duracaoVideoPrincipal > 5 && tempoMaximoAtingidoVideoPrincipal >= (duracaoVideoPrincipal - 3.5)) {
                isAnuncioDeFimDeVideo = true;
                console.log("Projetor Igreja: Anúncio de encerramento (post-roll) detectado.");
            } else {
                isAnuncioDeFimDeVideo = false;
            }
        }

        // 4. Registro único de log
        if (!adLogadoDeteccao && video) {
            adLogadoDeteccao = true;
            registrarLogAd("Anúncio detectado. Modo Cortina ativado, áudio mutado instantaneamente e aceleração acionada.");
        }

        // 5. Clica no botão de pular se já estiver disponível
        const skipButtons = document.querySelectorAll('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-text.ytp-ad-skip-button-text');
        if (skipButtons.length > 0 && !adLogadoSkip) {
            skipButtons.forEach(btn => {
                if (btn && typeof btn.click === 'function') btn.click();
            });
            adLogadoSkip = true;
            registrarLogAd("Botão 'Pular Anúncio' encontrado e clicado.");
        }

        // 6. Para anúncios não-puláveis, acelera ao máximo e avança
        if (video && !isNaN(video.duration) && video.currentTime < video.duration - 0.2) {
            video.playbackRate = 16.0;
            if (video.duration > 0) {
                video.currentTime = video.duration - 0.1;
            }
        }
    } else {
        // Nenhum anúncio ativo
        aplicarVisualCortina(false);

        // Se estava em anúncio e agora acabou a publicidade:
        if (isUltimoEstadoAdAtivo) {
            isUltimoEstadoAdAtivo = false;
            notificarEstadoVideo({ isAd: false });

            // CRÍTICO: Se a propaganda que acabou estava no final do vídeo (post-roll)
            // ou se o vídeo oficial do culto já encerrou, finaliza imediatamente e avança a playlist
            const hasEndscreen = document.querySelector('.ytp-videowall-still, .html5-endscreen:not([style*="display: none"]), .ytp-endscreen-paginate');
            const videoAcabou = isAnuncioDeFimDeVideo || 
                                (video && video.ended) || 
                                (duracaoVideoPrincipal > 5 && tempoMaximoAtingidoVideoPrincipal >= (duracaoVideoPrincipal - 3.5)) ||
                                Boolean(hasEndscreen);

            if (videoAcabou) {
                console.log("Projetor Igreja: Anúncio pós-vídeo concluído. Finalizando vídeo e avançando playlist...");
                isAnuncioDeFimDeVideo = false;
                finalizarVideoEAvancarPlaylist();
                return;
            }

            if (video) {
                if (video.playbackRate !== 1.0) {
                    video.playbackRate = 1.0;
                }
                if (!adLogadoRestauracao) {
                    adLogadoRestauracao = true;
                    registrarLogAd("Anúncio encerrado. Modo Cortina desativado, velocidade e áudio restaurados com sucesso.");
                }
                // Inicia vigilância persistente pós-anúncio para desmutar e sincronizar com o player nativo
                iniciarVigilanciaPosAnuncio();
            }
        }

        adLogadoDeteccao = false;
        adLogadoSkip = false;
    }

    desativarAutoplayELegendas();
}

// Observa mutações de classe no player para interceptar anúncios no microssegundo 0
function iniciarObservadorAnunciosDOM() {
    const monitorar = () => {
        const player = document.querySelector('.html5-video-player') || document.getElementById('movie_player');
        if (player && !adMutationObserver) {
            adMutationObserver = new MutationObserver(() => {
                if (!document.documentElement.classList.contains('extensao-igreja-projector-active')) return;
                if (verificarSeHaAnuncio()) {
                    cortarAudioAnuncioImediato();
                    aplicarVisualCortina(true);
                    processarAnuncios();
                } else if (isUltimoEstadoAdAtivo) {
                    processarAnuncios();
                } else if (player.classList.contains('ended-mode') && duracaoVideoPrincipal > 5 && tempoMaximoAtingidoVideoPrincipal >= (duracaoVideoPrincipal - 5)) {
                    finalizarVideoEAvancarPlaylist();
                }
            });
            adMutationObserver.observe(player, {
                attributes: true,
                attributeFilter: ['class']
            });
        }
    };
    monitorar();
}

// Inicia sentinela em frequência equilibrada (100ms)
setInterval(processarAnuncios, 100);
iniciarObservadorAnunciosDOM();

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
            document.documentElement.classList.remove('video-finalizado');
            videoFinalizadoProcessado = false;
            if (response.prefDimmingAds !== undefined) {
                modoDimmingAdsAtivo = response.prefDimmingAds;
            }
            garantirOverlayCortina();

            // Força o modo cinema se necessário
            const theater = document.querySelector('ytd-watch-flexy[theater]');
            if (!theater) {
                const sizeBtn = document.querySelector('.ytp-size-button');
                if (sizeBtn) sizeBtn.click();
            }

            // Desativa autoplay e legendas se estiverem ativos
            desativarAutoplayELegendas();

            // Gerencia áudio e reprodução com segurança
            const video = document.querySelector('video');
            if (video) {
                if (!verificarSeHaAnuncio() && !isUltimoEstadoAdAtivo) {
                    sincronizarEDesmutarPlayerTelao(video);

                    if (video.paused) {
                        video.play().catch(() => { });
                    }
                } else {
                    cortarAudioAnuncioImediato();
                    aplicarVisualCortina(true);
                }
            }
        } else {
            document.documentElement.classList.remove('extensao-igreja-projector-active');
            aplicarVisualCortina(false);
            isUltimoEstadoAdAtivo = false;
            
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

    // Função central de enforcement na tela principal
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

// Obtém o storage de sessão (descartado automaticamente ao fechar o navegador)
function getSessionStorageVolume() {
    return (chrome.storage && chrome.storage.session) ? chrome.storage.session : null;
}

// Carrega preventivamente a preferência ao injetar o script (apenas da sessão)
const storSessionInit = getSessionStorageVolume();
if (storSessionInit) {
    storSessionInit.get(['ytVolumeLevel'], (res) => {
        if (res && typeof res.ytVolumeLevel === 'number') {
            ultimoVolumeConfigurado = Math.max(0, Math.min(1.0, res.ytVolumeLevel));
        } else {
            // Nova sessão do navegador: sempre restaura o volume no máximo (100%)
            ultimoVolumeConfigurado = 1.0;
            sincronizarStorageYouTube(1.0);
        }
        volumeConfiguradoCarregado = true;
    });
} else {
    ultimoVolumeConfigurado = 1.0;
    sincronizarStorageYouTube(1.0);
    volumeConfiguradoCarregado = true;
}

function aplicarVolumeConfigurado(video) {
    if (!video) return;
    // Guarda contra "Extension context invalidated" (ocorre quando a extensão é recarregada
    // mas os listeners antigos ainda estão ativos na aba do YouTube)
    if (!chrome.runtime?.id) return;

    // Se for anúncio, bloqueia terminantemente e garante corte total de áudio
    if (verificarSeHaAnuncio() || isUltimoEstadoAdAtivo) {
        cortarAudioAnuncioImediato();
        return;
    }

    // Aplicação síncrona imediata com o valor em cache (padrão 1.0 = 100%)
    if (Math.abs(video.volume - ultimoVolumeConfigurado) > 0.01) {
        video.volume = ultimoVolumeConfigurado;
    }

    const player = document.querySelector('.html5-video-player') || document.getElementById('movie_player');
    if (player && typeof player.setVolume === 'function') {
        try { player.setVolume(Math.round(ultimoVolumeConfigurado * 100)); } catch (e) {}
    }

    // Validação/Sincronização assíncrona com o storage de sessão
    const storSession = getSessionStorageVolume();
    if (storSession) {
        storSession.get(['ytVolumeLevel'], (res) => {
            if (!chrome.runtime?.id) return;
            if (verificarSeHaAnuncio() || isUltimoEstadoAdAtivo) {
                cortarAudioAnuncioImediato();
                return;
            }
            const volSalvo = (res && typeof res.ytVolumeLevel === 'number') ? res.ytVolumeLevel : 1.0;
            ultimoVolumeConfigurado = Math.max(0, Math.min(1.0, volSalvo));
            volumeConfiguradoCarregado = true;
            if (Math.abs(video.volume - ultimoVolumeConfigurado) > 0.01) {
                video.volume = ultimoVolumeConfigurado;
            }
            if (player && typeof player.setVolume === 'function') {
                try { player.setVolume(Math.round(ultimoVolumeConfigurado * 100)); } catch (e) {}
            }
            sincronizarStorageYouTube(ultimoVolumeConfigurado);
            notificarEstadoVideo();
        });
    }
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
                title: document.title.replace(/ - YouTube$/, ''),
                isAd: isUltimoEstadoAdAtivo
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
                videoFinalizadoProcessado = false;
                if (video.muted) video.muted = false;
                desmutarPlayerNativoYouTubeSeNecessario(video);
                limparMudoStorageYouTube();

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
                aplicarVisualCortina(false);
                isUltimoEstadoAdAtivo = false;
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
                const muteBtn = document.querySelector('.ytp-mute-button');
                if (muteBtn) {
                    const botaoMudoAtivo = isBotaoMuteDoYouTubeAtivo();
                    if (video.muted && !botaoMudoAtivo) {
                        muteBtn.click();
                    } else if (!video.muted && botaoMudoAtivo) {
                        muteBtn.click();
                    }
                }
                limparMudoStorageYouTube();
                sendResponse({ muted: video.muted, volume: video.volume });

            } else if (request.command === "volume") {
                cancelarFadeSeHouver(video);
                const novoVol = Math.max(0, Math.min(1.0, request.value));
                if (novoVol > 0) {
                    video.muted = false;
                    desmutarPlayerNativoYouTubeSeNecessario(video);
                }
                video.volume = novoVol;
                ultimoVolumeConfigurado = novoVol;
                const player = document.querySelector('.html5-video-player') || document.getElementById('movie_player');
                if (player && typeof player.setVolume === 'function') {
                    try { player.setVolume(Math.round(novoVol * 100)); } catch (e) {}
                }
                const storSession = getSessionStorageVolume();
                if (storSession) {
                    storSession.set({ ytVolumeLevel: novoVol });
                }
                sincronizarStorageYouTube(novoVol);
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
        isAd: isUltimoEstadoAdAtivo,
        ...extra
    };
    chrome.runtime.sendMessage(payload, () => {
        void chrome.runtime.lastError;
    });
}

let videoFinalizadoProcessado = false;

// Verifica se o vídeo oficial do culto realmente chegou ao fim
function verificarSeVideoChegouAoFim(video) {
    if (!video) video = document.querySelector('video');
    if (!video) return false;

    // Se estiver em anúncio ativo, o vídeo do culto ainda não é considerado finalizado
    if (verificarSeHaAnuncio() || isUltimoEstadoAdAtivo) return false;

    // Segurança essencial: vídeos no início (tempo < 1s) ou com duração inválida nunca são considerados no fim
    if (isNaN(video.duration) || video.duration < 3 || video.currentTime < 1) {
        return false;
    }

    // 1. Se a tag HTML5 disparou ended
    if (video.ended) return true;

    // 2. Se o player do YouTube está com a classe nativa de finalizado
    const player = document.querySelector('.html5-video-player') || document.getElementById('movie_player');
    if (player && player.classList.contains('ended-mode')) {
        return true;
    }

    // 3. Se o tempo atual atingiu o fim (com tolerância de 0.3s)
    if (video.currentTime >= video.duration - 0.3) {
        return true;
    }

    return false;
}

function finalizarVideoEAvancarPlaylist() {
    if (!document.documentElement.classList.contains('extensao-igreja-projector-active')) return;
    if (videoFinalizadoProcessado) return;
    videoFinalizadoProcessado = true;

    console.log("Projetor Igreja: Fim de vídeo confirmado. Ativando blackout e avançando playlist...");
    aplicarVisualCortina(false);
    isUltimoEstadoAdAtivo = false;
    document.documentElement.classList.add('video-finalizado');

    const video = document.querySelector('video');
    if (video) {
        video.pause();
    }

    // Desativa o autoplay nativamente se ainda estiver ligado
    const autoNavBtn = document.querySelector('.ytp-autonav-toggle-button');
    if (autoNavBtn && autoNavBtn.getAttribute('aria-checked') === 'true') {
        autoNavBtn.click();
    }

    // Notifica o background para avançar a playlist ou aplicar blackout
    if (chrome.runtime?.id) {
        chrome.runtime.sendMessage({ action: 'videoEnded' }, () => {
            void chrome.runtime.lastError;
        });
    }
}

function onVideoEndedEvent() {
    // Se o evento ended ocorreu enquanto havia um anúncio rodando, marca que o vídeo oficial do culto já encerrou
    if (verificarSeHaAnuncio() || isUltimoEstadoAdAtivo) {
        isAnuncioDeFimDeVideo = true;
        return;
    }
    finalizarVideoEAvancarPlaylist();
}

function onVideoTimeUpdateEvent() {
    if (verificarSeHaAnuncio() || isUltimoEstadoAdAtivo) return;
    const video = document.querySelector('video');
    if (video && !isNaN(video.duration) && video.duration > 2) {
        duracaoVideoPrincipal = video.duration;
        if (video.currentTime > tempoMaximoAtingidoVideoPrincipal) {
            tempoMaximoAtingidoVideoPrincipal = video.currentTime;
        }
    }
}

// Lógica para detectar fim do vídeo e gerenciar ciclo de eventos
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
    video.removeEventListener('timeupdate', onVideoTimeUpdateEvent);

    video.addEventListener('play', onVideoPlayEvent);
    video.addEventListener('pause', onVideoPauseEvent);
    video.addEventListener('playing', onVideoPlayingEvent);
    video.addEventListener('volumechange', onVideoVolumeChangeEvent);
    video.addEventListener('canplay', onVideoCanPlayEvent);
    video.addEventListener('ended', onVideoEndedEvent);
    video.addEventListener('timeupdate', onVideoTimeUpdateEvent);
}

function onVideoCanPlayEvent() {
    const video = document.querySelector('video');
    if (verificarSeHaAnuncio() || isUltimoEstadoAdAtivo) {
        cortarAudioAnuncioImediato();
        return;
    }
    if (video && !estaEmFade) {
        aplicarVolumeConfigurado(video);
    }
}

function onVideoPlayEvent() {
    const video = document.querySelector('video');
    if (verificarSeHaAnuncio() || isUltimoEstadoAdAtivo) {
        cortarAudioAnuncioImediato();
        return;
    }
    if (video && !estaEmFade) {
        if (isBotaoMuteDoYouTubeAtivo() || video.muted) {
            sincronizarEDesmutarPlayerTelao(video);
        } else {
            aplicarVolumeConfigurado(video);
        }
    }
    notificarEstadoVideo({ playing: true });
}

function onVideoPlayingEvent() {
    const video = document.querySelector('video');
    if (verificarSeHaAnuncio() || isUltimoEstadoAdAtivo) {
        cortarAudioAnuncioImediato();
        return;
    }
    // Se o vídeo estiver tocando e longe do final, reseta o flag de finalizado
    if (video && !isNaN(video.duration) && video.duration > 3 && video.currentTime < video.duration - 2) {
        videoFinalizadoProcessado = false;
    }
    if (video && !estaEmFade) {
        if (isBotaoMuteDoYouTubeAtivo() || video.muted) {
            sincronizarEDesmutarPlayerTelao(video);
        } else {
            aplicarVolumeConfigurado(video);
        }
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

    if (verificarSeHaAnuncio() || isUltimoEstadoAdAtivo) {
        cortarAudioAnuncioImediato();
        return;
    }

    const video = document.querySelector('video');
    if (video) {
        const volEsperado = (typeof ultimoVolumeConfigurado === 'number' && ultimoVolumeConfigurado > 0) ? ultimoVolumeConfigurado : 1.0;
        // Se o volume da tag divergir do configurado pelo operador e não estiver mudo:
        if (Math.abs(video.volume - volEsperado) > 0.03 && !video.muted) {
            video.volume = volEsperado;
            const player = document.querySelector('.html5-video-player') || document.getElementById('movie_player');
            if (player && typeof player.setVolume === 'function') {
                try { player.setVolume(Math.round(volEsperado * 100)); } catch (e) {}
            }
            sincronizarStorageYouTube(volEsperado);
        }
    }

    notificarEstadoVideo();
}

// Inicializa a lógica de fim de vídeo
setupPostVideoLogic();

// Re-inicializa no evento de mudança de página (SPA)
window.addEventListener('yt-navigate-finish', () => {
    videoFinalizadoProcessado = false;
    isAnuncioDeFimDeVideo = false;
    tempoMaximoAtingidoVideoPrincipal = 0;
    duracaoVideoPrincipal = 0;
    document.documentElement.classList.remove('video-finalizado');
    aplicarVisualCortina(false);
    isUltimoEstadoAdAtivo = false;
    setupPostVideoLogic();
    applyProjectorRules();
    // Notifica com atraso suave para esperar o título carregar
    setTimeout(() => notificarEstadoVideo(), 300);
    setTimeout(() => notificarEstadoVideo(), 1000);
});

// yt-navigate-start dispara ANTES do yt-navigate-finish, assim que o usuário clica num vídeo.
// Isso permite iniciar o enforcement de mudo/pause ainda mais cedo,
// enquanto o vídeo novo ainda está sendo carregado pela página.
window.addEventListener('yt-navigate-start', () => {
    videoFinalizadoProcessado = false;
    isAnuncioDeFimDeVideo = false;
    tempoMaximoAtingidoVideoPrincipal = 0;
    duracaoVideoPrincipal = 0;
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



