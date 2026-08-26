// ============================================================
// Projetor Igreja - Background Service Worker
// ============================================================

const GITHUB_REPO = 'marllonferreira/projetor_igreja';

// ⚠️ MODO TESTE ATIVO ⚠️
// Coloque false abaixo para voltar ao comportamento normal (1x ao dia)
const MODO_TESTE = false;

let projetorTabId = null;

// Recupera o ID salvo ao iniciar (se existir)
chrome.storage.local.get(["projetorTabId"], (result) => {
    if (result.projetorTabId) {
        projetorTabId = result.projetorTabId;
        console.log("Background: ID do projetor recuperado:", projetorTabId);
    }
});

// ── Ouve mensagens de outros scripts ──────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "setProjectorTabId") {
        projetorTabId = request.tabId;
        chrome.storage.local.set({ "projetorTabId": projetorTabId });
        console.log("Background: Novo ID do projetor definido:", projetorTabId);
        sendResponse({ status: "success" });
    }

    if (request.action === "isProjector") {
        const isProjector = (sender.tab && sender.tab.id === projetorTabId);
        sendResponse({ isProjector: isProjector });
    }

    // Fim de vídeo: avança a playlist diretamente no background (funciona mesmo com popup fechado)
    if (request.action === "videoEnded") {
        chrome.storage.session.get(['ytPlaylist', 'ytPlaylistIndex'], (data) => {
            const playlist = data.ytPlaylist || [];
            const currentIdx = (data.ytPlaylistIndex !== undefined) ? data.ytPlaylistIndex : -1;

            if (playlist.length === 0 || currentIdx < 0) {
                // Sem playlist ativa — só repassa para o popup atualizar a UI se estiver aberto
                chrome.runtime.sendMessage({ action: "videoEnded" }, () => { void chrome.runtime.lastError; });
                sendResponse({ ok: true });
                return;
            }

            const nextIdx = currentIdx + 1;
            if (nextIdx >= playlist.length) {
                // Era o último item — não faz nada
                sendResponse({ ok: true });
                return;
            }

            const nextItem = playlist[nextIdx];
            const watchUrl = `https://www.youtube.com/watch?v=${nextItem.id}`;

            // Atualiza o índice na sessão ANTES de navegar
            chrome.storage.session.set({ ytPlaylistIndex: nextIdx }, () => {
                // Navega a aba do projetor para o próximo vídeo
                chrome.storage.local.get(['projetorTabId'], (result) => {
                    const tabId = result.projetorTabId;
                    if (tabId) {
                        chrome.tabs.update(tabId, { url: watchUrl }, () => {
                            if (chrome.runtime.lastError) {
                                console.log("Background: Erro ao navegar para o próximo item:", chrome.runtime.lastError.message);
                            }
                        });
                    }
                    // Notifica o popup para re-renderizar a lista (se estiver aberto)
                    chrome.runtime.sendMessage({ action: "playlistAdvanced", newIndex: nextIdx }, () => {
                        void chrome.runtime.lastError;
                    });
                });
            });
        });
        sendResponse({ ok: true });
        return true; // async
    }

    // Verificação manual disparada pelo popup (Tela Sobre)
    if (request.action === "verificarAtualizacaoManual") {
        verificarAtualizacao(true).then((resultado) => {
            sendResponse(resultado);
        });
        return true; // Mantém o canal aberto para resposta assíncrona
    }

    // Disparo do download (chamado pela update.html ou popup)
    if (request.action === "baixarAtualizacao") {
        if (request.url) {
            chrome.downloads.download({
                url: request.url,
                saveAs: false
            }, (downloadId) => {
                sendResponse({ success: true, downloadId });
            });
        } else {
            sendResponse({ success: false, error: 'URL não informada' });
        }
        return true;
    }

    return true; // Mantém o canal de mensagem aberto para respostas assíncronas
});

// ── Limpa o ID se a aba for fechada ──────────────────────────────────────────
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === projetorTabId) {
        projetorTabId = null;
        chrome.storage.local.remove("projetorTabId");
        console.log("Background: Aba do projetor fechada. ID removido.");
    }
});

// ── Limpa estado da mídia ao reiniciar o navegador, se configurado ─────────
chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(["projetorSettings"], (result) => {
        const settings = result.projetorSettings || {};
        // Se a opção não existir, assumimos true (padrão)
        if (settings.prefMemorizarMidia === false) {
            chrome.storage.local.remove("midiaState");
            console.log("Background: Galeria de mídias limpa ao iniciar (prefMemorizarMidia = false)");
        }
    });

    // Verificação de atualização na abertura do navegador
    agendarVerificacaoDiaria();
});

// ── Instala alarme diário na primeira vez / reinsatação ───────────────────────
chrome.runtime.onInstalled.addListener(() => {
    agendarVerificacaoDiaria();
});

// ── Ouve o alarme periódico ───────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'verificarAtualizacaoAlarm') {
        console.log("Background: Alarme disparado...");
        if (MODO_TESTE) {
            verificarAtualizacao(false);
        } else {
            chrome.storage.local.get(['projetorSettings'], (result) => {
                const settings = result.projetorSettings || {};
                const dias = settings.prefFrequenciaAtualizacao || 3;
                verificarSeDeveChecar(dias);
            });
        }
    }
});

// ── Agenda alarme diário ──────────────────────────────────────────────────────
function agendarVerificacaoDiaria() {
    chrome.storage.local.get(['projetorSettings'], (result) => {
        const settings = result.projetorSettings || {};
        const dias = settings.prefFrequenciaAtualizacao || 3;
        
        // Em modo teste: recria o alarme sempre para garantir disparo imediato
        chrome.alarms.clear('verificarAtualizacaoAlarm', () => {
            const intervaloMinutos = MODO_TESTE ? 1 : (dias * 24) * 60;
            const delayMinutos = MODO_TESTE ? 0.1 : 1; // 6 segundos no modo teste

            chrome.alarms.create('verificarAtualizacaoAlarm', {
                delayInMinutes: delayMinutos,
                periodInMinutes: intervaloMinutos
            });

            if (MODO_TESTE) {
                console.log("Background: ⚠️ MODO TESTE — alarme disparará em ~6 segundos e repetirá a cada 1 minuto.");
            } else {
                console.log(`Background: Alarme de verificação de atualização criado (intervalo normal de ${dias} dias).`);
            }
        });

        // Em modo normal: verifica se já passou o tempo necessário antes de checar
        if (!MODO_TESTE) {
            verificarSeDeveChecar(dias);
        } else {
            console.log("Background: ⚠️ MODO TESTE — pulando guarda temporal.");
        }
    });
}

// ── Verifica se já passou o tempo necessário desde a última checagem ──────────
function verificarSeDeveChecar(diasIntervalo) {
    chrome.storage.local.get(['ultimaVerificacaoAtualizacao'], (result) => {
        const ultima = result.ultimaVerificacaoAtualizacao || 0;
        const agora = Date.now();
        const diferencaHoras = (agora - ultima) / (1000 * 60 * 60);
        const checkIntervalHoras = diasIntervalo * 24;

        if (diferencaHoras >= checkIntervalHoras) {
            console.log(`Background: Mais de ${checkIntervalHoras}h desde a última checagem. Verificando agora...`);
            verificarAtualizacao(false);
        } else {
            console.log(`Background: Última checagem foi há ${Math.round(diferencaHoras)}h. Intervalo configurado é de ${checkIntervalHoras}h. Nenhuma ação necessária.`);
        }
    });
}

// ── Função principal de verificação de atualização ────────────────────────────
async function verificarAtualizacao(isManual = false) {
    try {
        const versaoAtual = chrome.runtime.getManifest().version;
        console.log(`Background: Verificando atualização... Versão atual: ${versaoAtual}`);

        const response = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
            { headers: { 'Accept': 'application/vnd.github.v3+json' } }
        );

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error("Limite de consultas ao GitHub atingido. Tente novamente mais tarde.");
            }
            throw new Error(`GitHub API respondeu com status: ${response.status}`);
        }

        const release = await response.json();
        const versaoNova = release.tag_name.replace(/^v/i, ''); // Remove 'v' prefixo se houver
        const notas = release.body || 'Sem notas de lançamento disponíveis.';
        const nomeRelease = release.name || `Versão ${versaoNova}`;
        const publishedAt = release.published_at;

        // Busca o primeiro .zip nos assets da release
        const zipAsset = (release.assets || []).find(a => a.name.endsWith('.zip'));
        const urlDownload = zipAsset ? zipAsset.browser_download_url : null;

        // Salva a data da última verificação
        chrome.storage.local.set({ ultimaVerificacaoAtualizacao: Date.now() });

        // Compara versões (normaliza para comparação semântica simples)
        const temAtualizacao = compararVersoes(versaoNova, versaoAtual) > 0;

        console.log(`Background: Versão no GitHub: ${versaoNova} | Tem atualização: ${temAtualizacao}`);

        // Salva dados da release no storage para uso no popup e update.html
        const dadosAtualizacao = {
            temAtualizacao,
            versaoAtual,
            versaoNova,
            nomeRelease,
            notas,
            urlDownload,
            publishedAt,
            ultimaChecagem: new Date().toLocaleString('pt-BR')
        };
        chrome.storage.local.set({ dadosAtualizacao });

        // Dispara o aviso visual apenas se há atualização
        if (temAtualizacao) {
            if (!isManual) {
                // Verificação automática: injeta o Toast na aba ativa
                injetarToastNaAbaAtiva(versaoNova, nomeRelease).then(sucesso => {
                    if (!sucesso) {
                        // Se falhou (ex: o usuário estava na nova guia do Chrome),
                        // marca como pendente para exibir quando ele trocar de aba.
                        chrome.storage.local.set({
                            toastPendente: true,
                            toastVersao: versaoNova,
                            toastNome: nomeRelease
                        });
                        console.log("Background: Toast agendado para quando uma aba válida for aberta.");
                    }
                });
            }
        }

        return dadosAtualizacao;

    } catch (error) {
        console.error("Background: Erro ao verificar atualização:", error);
        const dadosErro = {
            temAtualizacao: false,
            erro: error.message,
            ultimaChecagem: new Date().toLocaleString('pt-BR')
        };
        chrome.storage.local.set({ dadosAtualizacao: dadosErro });
        return dadosErro;
    }
}

// ── Compara duas versões semânticas (retorna 1 se a > b, -1 se a < b, 0 se iguais) ──
function compararVersoes(a, b) {
    const partes = (v) => v.split('.').map(n => parseInt(n) || 0);
    const pa = partes(a);
    const pb = partes(b);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na > nb) return 1;
        if (na < nb) return -1;
    }
    return 0;
}

// ── Injeta o Toast de aviso na aba ativa do navegador ────────────────────────
async function injetarToastNaAbaAtiva(versaoNova, nomeRelease) {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) return false;

        const tab = tabs[0];

        // Só injeta em abas HTTP/HTTPS normais
        if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
            return false;
        }

        const updateUrl = chrome.runtime.getURL('update.html');

        // Verifica se o nome da release é o mesmo da versão para não duplicar no texto
        let textoRelease = '';
        if (nomeRelease && !nomeRelease.includes(versaoNova) && nomeRelease.toLowerCase() !== `v${versaoNova}`) {
            textoRelease = `<br><span style="color: #9b9bbb; font-size: 10px;">${nomeRelease}</span>`;
        }

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (versaoNova, textoRelease, updateUrl) => {
                // Evita criar múltiplos toasts
                if (document.getElementById('projetor-igreja-update-toast')) return;

                // Detecção simples do navegador
                let browserName = 'Navegador';
                const ua = navigator.userAgent;
                if (ua.includes('Edg/')) {
                    browserName = 'Edge';
                } else if (ua.includes('OPR/') || ua.includes('Opera')) {
                    browserName = 'Opera';
                } else if (ua.includes('Chrome/')) {
                    browserName = 'Chrome';
                } else if (ua.includes('Firefox/')) {
                    browserName = 'Firefox';
                }

                const toast = document.createElement('div');
                toast.id = 'projetor-igreja-update-toast';
                toast.style.cssText = `
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    z-index: 2147483647;
                    background: linear-gradient(135deg, #17171f, #1e1e2e);
                    border: 1px solid #7c5cbf;
                    border-radius: 14px;
                    padding: 16px 18px;
                    width: 320px;
                    box-shadow: 0 8px 32px rgba(124, 92, 191, 0.45), 0 2px 8px rgba(0,0,0,0.6);
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    color: #e8e8f0;
                    animation: projetorSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                    cursor: default;
                `;

                toast.innerHTML = `
                    <style>
                        @keyframes projetorSlideIn {
                            from { opacity: 0; transform: translateX(60px) scale(0.92); }
                            to   { opacity: 1; transform: translateX(0) scale(1); }
                        }
                        @keyframes projetorSlideOut {
                            from { opacity: 1; transform: translateX(0) scale(1); }
                            to   { opacity: 0; transform: translateX(60px) scale(0.92); }
                        }
                        #projetor-igreja-update-toast * { box-sizing: border-box; margin: 0; padding: 0; }
                        #projetor-igreja-update-toast .pi-toast-badge {
                            display: inline-block;
                            background: linear-gradient(135deg, #7c5cbf, #5b3fa0);
                            color: #fff;
                            font-size: 9px;
                            font-weight: 700;
                            letter-spacing: 1px;
                            text-transform: uppercase;
                            padding: 3px 8px;
                            border-radius: 20px;
                            margin-bottom: 8px;
                        }
                        #projetor-igreja-update-toast .pi-toast-title {
                            font-size: 13px;
                            font-weight: 700;
                            color: #e8e8f0;
                            margin-bottom: 4px;
                            line-height: 1.3;
                        }
                        #projetor-igreja-update-toast .pi-toast-sub {
                            font-size: 11px;
                            color: #9b9bbb;
                            margin-bottom: 12px;
                            line-height: 1.4;
                        }
                        #projetor-igreja-update-toast .pi-toast-version {
                            color: #9965f4;
                            font-weight: 600;
                        }
                        #projetor-igreja-update-toast .pi-toast-btns {
                            display: flex;
                            gap: 8px;
                        }
                        #projetor-igreja-update-toast .pi-toast-btn-main {
                            flex: 1;
                            padding: 8px 12px;
                            background: linear-gradient(135deg, #7c5cbf, #5b3fa0);
                            border: none;
                            border-radius: 8px;
                            color: #fff;
                            font-size: 11px;
                            font-weight: 700;
                            cursor: pointer;
                            transition: all 0.18s ease;
                            letter-spacing: 0.3px;
                        }
                        #projetor-igreja-update-toast .pi-toast-btn-main:hover {
                            background: linear-gradient(135deg, #9965f4, #7c5cbf);
                            box-shadow: 0 4px 14px rgba(124, 92, 191, 0.5);
                        }
                        #projetor-igreja-update-toast .pi-toast-btn-close {
                            padding: 8px 10px;
                            background: transparent;
                            border: 1px solid #2a2a38;
                            border-radius: 8px;
                            color: #6b6b82;
                            font-size: 13px;
                            cursor: pointer;
                            transition: all 0.18s ease;
                            line-height: 1;
                        }
                        #projetor-igreja-update-toast .pi-toast-btn-close:hover {
                            border-color: #444;
                            color: #aaa;
                        }
                    </style>
                    <div class="pi-toast-badge">🔔 Atualização de Extensão</div>
                    <div class="pi-toast-title">A extensão Projetor Igreja tem uma nova versão!</div>
                    <div class="pi-toast-sub">
                        Sua extensão do ${browserName} tem uma atualização (<span class="pi-toast-version">v${versaoNova}</span>) disponível.${textoRelease}
                    </div>
                    <div class="pi-toast-btns">
                        <button class="pi-toast-btn-main" id="pi-toast-saibamais">✨ Saiba Mais</button>
                        <button class="pi-toast-btn-close" id="pi-toast-fechar" title="Fechar">✕</button>
                    </div>
                `;

                document.body.appendChild(toast);

                document.getElementById('pi-toast-saibamais').addEventListener('click', () => {
                    window.open(updateUrl, '_blank');
                    fecharToast();
                });

                document.getElementById('pi-toast-fechar').addEventListener('click', fecharToast);

                function fecharToast() {
                    toast.style.animation = 'projetorSlideOut 0.3s ease forwards';
                    setTimeout(() => toast.remove(), 320);
                }

                // Auto-fechar após 15 segundos
                setTimeout(fecharToast, 15000);
            },
            args: [versaoNova, textoRelease, updateUrl]
        });

        console.log("Background: Toast de atualização injetado com sucesso.");
        return true;
    } catch (err) {
        console.log("Background: Não foi possível injetar o Toast:", err.message);
        return false;
    }
}

// ── Garantia de Exibição do Toast ─────────────────────────────────────────────
// Se a injeção falhar (ex: usuário na página inicial do navegador chrome://newtab),
// guardamos que a notificação está pendente e tentamos de novo ao mudar de aba.

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        verificarToastPendente();
    }
});

chrome.tabs.onActivated.addListener(() => {
    verificarToastPendente();
});

function verificarToastPendente() {
    chrome.storage.local.get(['toastPendente', 'toastVersao', 'toastNome'], (result) => {
        if (result.toastPendente) {
            injetarToastNaAbaAtiva(result.toastVersao, result.toastNome).then(sucesso => {
                if (sucesso) {
                    console.log("Background: Toast pendente foi injetado com sucesso na nova aba.");
                    chrome.storage.local.remove(['toastPendente', 'toastVersao', 'toastNome']);
                }
            });
        }
    });
}
