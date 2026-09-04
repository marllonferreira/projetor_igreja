// projetor_time.js

let relogioInterval = null;
let contadorInterval = null;

let currentModo = 'nenhum'; // nenhum, cronometro, timer
let isContando = false;
let totalSegundosConfig = 0; // Segundos totais configurados para o timer
let tempoAtualSegundos = 0; // Segundos restantes (timer) ou decorridos (cronômetro)
let lastTickTime = 0;

function formatTime(totalSeconds, showHours) {
    if (totalSeconds < 0) totalSeconds = 0;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    
    let res = '';
    if (showHours || h > 0) {
        res += h.toString().padStart(2, '0') + ':';
    }
    res += m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
    return res;
}

function updateRelogio() {
    const agora = new Date();
    const h = agora.getHours().toString().padStart(2, '0');
    const m = agora.getMinutes().toString().padStart(2, '0');
    const s = agora.getSeconds().toString().padStart(2, '0');
    const el = document.getElementById('relogio-alvo');
    if (el) el.textContent = `${h}:${m}:${s}`;
}

let lastTimeStr = '';

function updateContador() {
    const el = document.getElementById('contador-alvo');
    if (!el) return;
    
    if (isContando) {
        const agora = Date.now();
        const deltaSecs = (agora - lastTickTime) / 1000;
        lastTickTime = agora;
        
        if (currentModo === 'cronometro') {
            tempoAtualSegundos += deltaSecs;
        } else if (currentModo === 'timer') {
            tempoAtualSegundos -= deltaSecs;
            if (tempoAtualSegundos <= 0) {
                tempoAtualSegundos = 0;
                isContando = false;
            }
        }
    }
    
    const str = formatTime(tempoAtualSegundos, true);
    el.textContent = str;
    
    if (str !== lastTimeStr) {
        lastTimeStr = str;
        try {
            chrome.runtime.sendMessage({ action: 'timeTick', timeStr: str });
        } catch (e) {
            // popup pode estar fechado, ignora erro silenciosamente
        }
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'showTime') {
        const container = document.getElementById('conteudoTime');
        const relogioEl = document.getElementById('relogio-alvo');
        const contadorEl = document.getElementById('contador-alvo');
        const textoEl = document.getElementById('texto-alvo');
        
        if (!container) return;

        const isVisible = container.classList.contains('show');

        const updateContent = () => {
            // Configurar Exibição do Relógio
            if (message.exibirRelogio) {
                relogioEl.style.display = 'block';
                updateRelogio();
                if (!relogioInterval) relogioInterval = setInterval(updateRelogio, 1000);
            } else {
                relogioEl.style.display = 'none';
                if (relogioInterval) {
                    clearInterval(relogioInterval);
                    relogioInterval = null;
                }
            }
            
            // Configurar Contador (Cronômetro / Timer)
            if (message.iniciarDoZero) {
                currentModo = message.modo || 'nenhum';
                isContando = false;
                if (currentModo === 'timer') {
                    totalSegundosConfig = (parseInt(message.minutos) || 0) * 60 + (parseInt(message.segundos) || 0);
                    tempoAtualSegundos = totalSegundosConfig;
                } else if (currentModo === 'cronometro') {
                    tempoAtualSegundos = 0;
                }
            }
            
            if (currentModo === 'nenhum') {
                contadorEl.style.display = 'none';
                if (contadorInterval) {
                    clearInterval(contadorInterval);
                    contadorInterval = null;
                }
            } else {
                contadorEl.style.display = 'block';
                if (!contadorInterval) {
                    lastTickTime = Date.now();
                    contadorInterval = setInterval(updateContador, 200);
                }
                updateContador(); // atualiza imediato
            }
            
            // Configurar Texto Livre
            if (message.textoLivre && message.textoLivre.trim() !== '') {
                textoEl.style.display = 'block';
                textoEl.textContent = message.textoLivre;
            } else {
                textoEl.style.display = 'none';
            }
            
            // Aplicar Formatação
            const cor = message.cor || '#ffffff';
            const tamanho = message.tamanho || 8; // vw
            const alinhamento = message.alinhamento || 'center';
            
            container.style.textAlign = alinhamento;
            container.style.alignItems = alinhamento === 'center' ? 'center' : (alinhamento === 'left' ? 'flex-start' : 'flex-end');
            
            relogioEl.style.color = cor;
            contadorEl.style.color = cor;
            textoEl.style.color = cor;
            
            // Relógio e Contador ficam um pouco maiores que o texto livre
            relogioEl.style.fontSize = `${tamanho}vw`;
            contadorEl.style.fontSize = `${tamanho}vw`;
            textoEl.style.fontSize = `${tamanho * 0.7}vw`;
            
            // Mostrar
            setTimeout(() => container.classList.add('show'), 50);
        };

        if (isVisible) {
            container.classList.remove('show');
            setTimeout(updateContent, 400); // 400ms do CSS
        } else {
            updateContent();
        }
        
        sendResponse({ ok: true });
    }

    if (message.action === 'playTime') {
        if (!isContando && currentModo !== 'nenhum') {
            if (currentModo === 'timer' && tempoAtualSegundos <= 0) {
                // não inicia se timer estiver zerado
            } else {
                isContando = true;
                lastTickTime = Date.now();
            }
        }
        sendResponse({ ok: true });
    }

    if (message.action === 'pauseTime') {
        isContando = false;
        sendResponse({ ok: true });
    }

    if (message.action === 'resetTime') {
        isContando = false;
        if (currentModo === 'timer') {
            tempoAtualSegundos = totalSegundosConfig;
        } else if (currentModo === 'cronometro') {
            tempoAtualSegundos = 0;
        }
        updateContador();
        sendResponse({ ok: true });
    }

    if (message.action === 'encerrarTime') {
        const container = document.getElementById('conteudoTime');
        if (container) {
            container.classList.remove('show');
            setTimeout(() => {
                if (relogioInterval) { clearInterval(relogioInterval); relogioInterval = null; }
                if (contadorInterval) { clearInterval(contadorInterval); contadorInterval = null; }
                isContando = false;
            }, 800);
        }
        sendResponse({ ok: true });
    }
});
