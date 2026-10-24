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
