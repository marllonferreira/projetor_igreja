// ============================================================
// Projetor Igreja - update.js
// Lógica da tela de detalhes de atualização
// ============================================================

// Carrega tema dinamicamente
chrome.storage.local.get(["projetorSettings"], (result) => {
    if (result.projetorSettings && result.projetorSettings.themeMode) {
        const mode = result.projetorSettings.themeMode;
        if (mode === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
        else if (mode === 'light') document.documentElement.setAttribute('data-theme', 'light');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    carregarDadosAtualizacao();
});

async function carregarDadosAtualizacao() {
    chrome.storage.local.get(['dadosAtualizacao'], (result) => {
        const dados = result.dadosAtualizacao;
        renderizarTela(dados);
    });
}

function renderizarTela(dados) {
    const mainContent = document.getElementById('mainContent');
    const subtitle = document.getElementById('pageSubtitle');

    if (!dados) {
        // Sem dados: exibe mensagem genérica
        subtitle.textContent = 'Nenhuma informação de atualização encontrada.';
        mainContent.innerHTML = `
            <div class="card">
                <div class="up-to-date show">
                    <div class="big-icon">🔍</div>
                    <h2>Nenhuma informação disponível</h2>
                    <p>Abra o popup da extensão e use a seção "Sobre" para verificar manualmente.</p>
                </div>
            </div>
        `;
        return;
    }

    if (dados.erro) {
        subtitle.textContent = 'Erro ao verificar atualização';
        mainContent.innerHTML = `
            <div class="card">
                <div class="up-to-date show">
                    <div class="big-icon">⚠️</div>
                    <h2>Não foi possível verificar</h2>
                    <p>${escapeHtml(dados.erro)}</p>
                    <p style="margin-top:8px; font-size:11px;">Verifique sua conexão e tente novamente.</p>
                </div>
            </div>
        `;
        return;
    }

    if (!dados.temAtualizacao) {
        subtitle.textContent = 'Sua extensão está atualizada!';
        mainContent.innerHTML = `
            <div class="card">
                <div class="up-to-date show">
                    <div class="big-icon">✅</div>
                    <h2>Você já tem a versão mais recente!</h2>
                    <p>Versão atual: <strong>v${escapeHtml(dados.versaoAtual)}</strong></p>
                    <p style="margin-top:4px; color: var(--muted); font-size:12px;">Última verificação: ${escapeHtml(dados.ultimaChecagem || '')}</p>
                </div>
            </div>
        `;
        return;
    }

    // Há atualização disponível
    subtitle.textContent = `Nova versão v${dados.versaoNova} disponível!`;

    // Formata a data de publicação
    let dataFormatada = '';
    if (dados.publishedAt) {
        try {
            dataFormatada = new Date(dados.publishedAt).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric'
            });
        } catch (e) {
            dataFormatada = '';
        }
    }

    mainContent.innerHTML = `
        <!-- Badges de versão -->
        <div class="version-row">
            <span class="badge badge-current">📦 Atual: v${escapeHtml(dados.versaoAtual)}</span>
            <span class="badge-arrow">→</span>
            <span class="badge badge-new">✨ Nova: v${escapeHtml(dados.versaoNova)}</span>
            ${dataFormatada ? `<span class="badge badge-date">📅 ${dataFormatada}</span>` : ''}
        </div>

        <!-- Card: Notas de lançamento -->
        <div class="card">
            <div class="card-title">📋 Novidades desta versão</div>
            <div class="changelog" id="changelog">
                ${renderizarChangelog(dados.notas)}
            </div>
        </div>

        <!-- Ações -->
        <div class="actions">
            <button class="btn-download" id="btnDownload" ${!dados.urlDownload ? 'disabled title="Arquivo ZIP não encontrado nesta release"' : ''}>
                ${dados.urlDownload ? '⬇️ Baixar Atualização' : '⚠️ ZIP não disponível'}
            </button>
            <a class="btn-secondary" href="https://github.com/marllonferreira/projetor_igreja/releases/latest" target="_blank">
                🔗 Ver no GitHub
            </a>
        </div>

        <!-- Status do download -->
        <div class="download-status" id="downloadStatus"></div>
    `;

    // Listener do botão de download
    const btnDownload = document.getElementById('btnDownload');
    if (btnDownload && dados.urlDownload) {
        btnDownload.addEventListener('click', () => iniciarDownload(dados.urlDownload, dados.versaoNova));
    }
}

function iniciarDownload(url, versaoNova) {
    const btn = document.getElementById('btnDownload');
    const status = document.getElementById('downloadStatus');

    btn.disabled = true;
    btn.textContent = '⏳ Iniciando download...';

    chrome.runtime.sendMessage(
        { action: 'baixarAtualizacao', url },
        (response) => {
            if (chrome.runtime.lastError || !response || !response.success) {
                const errMsg = chrome.runtime.lastError?.message || 'Erro desconhecido';
                status.className = 'download-status error show';
                status.innerHTML = `⚠️ Erro ao iniciar download: ${escapeHtml(errMsg)}`;
                btn.disabled = false;
                btn.innerHTML = '⬇️ Baixar Atualização';
            } else {
                status.className = 'download-status show';
                status.innerHTML = `✅ Download da v${escapeHtml(versaoNova)} iniciado! Verifique sua pasta de Downloads.`;
                btn.innerHTML = '✅ Download Iniciado!';
            }
        }
    );
}

// ── Renderiza as notas de lançamento do GitHub (Markdown básico) ──────────────
function renderizarChangelog(texto) {
    if (!texto || texto.trim() === '') {
        return '<span style="color: var(--muted);">Sem notas de lançamento disponíveis.</span>';
    }

    const linhas = texto.split('\n');
    let html = '';

    for (let linha of linhas) {
        linha = linha.trimEnd();

        if (linha.startsWith('## ')) {
            html += `<div class="ch-h2">${escapeHtml(linha.slice(3))}</div>`;
        } else if (linha.startsWith('### ')) {
            html += `<div class="ch-h3">${escapeHtml(linha.slice(4))}</div>`;
        } else if (linha.startsWith('- ') || linha.startsWith('* ')) {
            html += `<div class="ch-li"><span class="ch-li-dot">•</span><span>${formatarInline(escapeHtml(linha.slice(2)))}</span></div>`;
        } else if (linha === '') {
            html += '<br>';
        } else {
            html += `<div>${formatarInline(escapeHtml(linha))}</div>`;
        }
    }

    return html;
}

// Formata marcações inline: **negrito**, `código`
function formatarInline(texto) {
    return texto
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code style="background: rgba(124,92,191,0.15); padding: 1px 5px; border-radius: 4px; font-size: 12px; font-family: monospace;">$1</code>');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
