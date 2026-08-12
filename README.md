# Projetor Igreja (v2.0)

<div align="center">
  <img src="doc/01.PNG" width="300" alt="Exemplo de Uso">
</div>

Uma extensão para navegadores baseados em Chromium (Google Chrome, Edge, Brave) desenvolvida especificamente para facilitar e profissionalizar a projeção de vídeos do YouTube em igrejas, cultos e eventos. Ela limpa toda a interface do YouTube, removendo distrações, e oferece um painel de controle remoto avançado diretamente pelo menu da extensão.

## 🚀 Recursos Principais

- **Limpeza de Interface Automática:** Oculta completamente barra de pesquisa, comentários, vídeos sugeridos, chat ao vivo e o título do vídeo, deixando apenas o conteúdo visual em destaque.
- **Ajuste Automático:** Força o player do YouTube para o modo cinema/teatro e maximiza o vídeo.
- **Painel de Controle Remoto via Popup:** 
  - Controle unificado de **Play/Pause**, sincronizado em tempo real.
  - Função de **Stop** real (interrompe, escurece a tela e reinicia o tempo).
  - Alternância de **Tela Cheia** com apenas um clique.
  - **Barra de Progresso e Título (NOVO):** Acompanhe o título do vídeo atual, e o progresso do tempo (minutos e segundos) direto do popup sem precisar olhar para o telão.
  - Controle de Volume integrado com botão rápido de Mudo (Mute).
- **Menu de Preferências (NOVO):** Personalize sua extensão ativando/desativando botões para limpar o painel. Você também pode definir se a janela abre em Tela Cheia por padrão, e em qual monitor ela deve abrir.
- **Segurança Antifalhas:** O botão "Fechar Telão" exige clique duplo para confirmação, evitando que a projeção seja desligada acidentalmente no meio do culto.
- **Modo Blackout de Segurança (Pós-Culto):** Quando o vídeo termina, a tela escurece (blackout total) automaticamente e o autoplay nativo do YouTube é bloqueado, evitando que outro vídeo inicie de surpresa.
- **Gerenciamento Inteligente de Abas:** Botão para abrir uma tela de projeção exclusiva e enviar os vídeos para ela em tempo real. Possui detecção aprimorada e notificações amigáveis diretamente na interface.

## 📦 Como Instalar a Extensão


### Opção 1 — Instalador Automático (Recomendado para uso final)

Acesse a pasta [`instalacao/`](instalacao/) deste projeto. Lá você encontrará a extensão compactada (`.crx`) junto com um script que configura tudo automaticamente no Windows:

1. Copie a pasta `instalacao/projetor_igreja` para `C:\projetor_igreja\`
2. Execute `instalar.bat` como **Administrador**
3. Reinicie o Chrome — a extensão será instalada permanentemente ✅

### Opção 2 — Modo Desenvolvedor (para contribuidores e testes)

1. **Acesse as Extensões:** `chrome://extensions/` e ative o **"Modo do desenvolvedor"**.
2. **Carregar sem compactação:** Clique em "Load unpacked" e selecione esta pasta (a que contém o `manifest.json`).
3. **Fixe a extensão** clicando no ícone de quebra-cabeça 🧩 na barra do Chrome.

## 💻 Como Usar

1. Clique no ícone da extensão na sua barra superior.
2. Clique no botão **"Abrir Telão"**. Isso abrirá uma janela limpa, que você pode arrastar para o seu segundo monitor (telão).
3. Na sua janela principal, navegue normalmente pelo YouTube e encontre o vídeo desejado.
4. Abra o vídeo, clique no ícone da extensão novamente e escolha **"Projetar Vídeo Atual"**.
5. O vídeo será automaticamente enviado e aberto na janela do projetor. 
6. Use os controles de Play, Pause, Stop, Tela Cheia, Volume e a nova Barra de Progresso no popup da extensão para manipular o vídeo remotamente, sem precisar clicar no telão.
7. **(Dica)** Você pode clicar no ícone de "Engrenagem" ⚙️ para abrir as Preferências e ocultar botões que não utilize muito, deixando a interface mais minimalista!

## 📄 Licença

Este projeto é de código aberto e está sob a licença [MIT](LICENSE). Sinta-se à vontade para usar, modificar e distribuir o código conforme necessário em sua congregação.