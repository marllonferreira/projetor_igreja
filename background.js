let projetorTabId = null;

// Recupera o ID salvo ao iniciar (se existir)
chrome.storage.local.get(["projetorTabId"], (result) => {
    if (result.projetorTabId) {
        projetorTabId = result.projetorTabId;
        console.log("Background: ID do projetor recuperado:", projetorTabId);
    }
});

// Ouve mensagens de outros scripts
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

    return true; // Mantém o canal de mensagem aberto para respostas assíncronas
});

// Limpa o ID se a aba for fechada
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === projetorTabId) {
        projetorTabId = null;
        chrome.storage.local.remove("projetorTabId");
        console.log("Background: Aba do projetor fechada. ID removido.");
    }
});

// Limpa estado da mídia ao reiniciar o navegador, se configurado
chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(["projetorSettings"], (result) => {
        const settings = result.projetorSettings || {};
        // Se a opção não existir, assumimos true (padrão)
        if (settings.prefMemorizarMidia === false) {
            chrome.storage.local.remove("midiaState");
            console.log("Background: Galeria de mídias limpa ao iniciar (prefMemorizarMidia = false)");
        }
    });
});
