# Projetor Igreja

<div align="center">
  <p>
    <img src="https://img.shields.io/badge/vers%C3%A3o-3.0-blue.svg" alt="Versão">
    <img src="https://img.shields.io/badge/plataforma-Chrome%20Extension-4285F4.svg" alt="Plataforma">
    <img src="https://img.shields.io/badge/HTML5%20|%20CSS3%20|%20JS-Vanilla-F7DF1E.svg" alt="Tecnologias">
    <a href="LICENSE"><img src="https://img.shields.io/badge/licen%C3%A7a-MIT-green.svg" alt="Licença"></a>
  </p>
</div>

<div align="center">
  <table>
    <tr>
      <td align="center"><img src="doc/youtube.PNG" width="220" alt="Módulo YouTube"><br><b>YouTube</b></td>
      <td align="center"><img src="doc/media.PNG" width="220" alt="Módulo Mídia"><br><b>Mídia</b></td>
      <td align="center"><img src="doc/biblia.PNG" width="220" alt="Módulo Bíblia"><br><b>Bíblia</b></td>
    </tr>
  </table>
</div>

Uma extensão para navegadores baseados em Chromium (Google Chrome, Edge, Brave) desenvolvida especificamente para facilitar e profissionalizar a projeção multimídia em igrejas, cultos e eventos. Com um **sistema modular**, ela permite gerenciar de um só lugar projeções de vídeos do YouTube, leitura de versículos bíblicos e exibição de imagens locais, tudo com um painel de controle remoto avançado e uma saída de vídeo extremamente limpa.

## 🧩 Módulos do Sistema

### 🔴 Módulo YouTube
- **Limpeza de Interface:** Oculta completamente barra de pesquisa, comentários, vídeos sugeridos, chat ao vivo e o título do vídeo.
- **Controle Remoto Sincronizado:** Play/Pause, Stop (escurece a tela e reinicia o tempo), Tela Cheia e Controle de Volume (com botão Mute).
- **Acompanhamento de Status:** Barra de progresso visível no popup mostrando o tempo decorrido do vídeo.
- **Modo Blackout (Pós-Culto):** Quando o vídeo termina, a tela escurece e bloqueia o autoplay nativo do YouTube, evitando vídeos surpresas.

### 🖼️ Módulo Mídia (Imagens)
- **Seleção Flexível:** Carregue arquivos de imagem individuais ou selecione uma pasta inteira de uma vez.
- **Galeria Interativa:** Visualize miniaturas das mídias carregadas com destaque na imagem que está sendo projetada.
- **Manipulação Ao Vivo:** Ajuste o zoom para adequar à tela e rotacione as imagens em 90 graus (ideal para fotos de celular).
- **Transição Suave:** Encerre a apresentação de mídia a qualquer momento com um clique, aplicando um "fade out" escuro na tela.

### 📖 Módulo Bíblia
- **Projeção de Versículos:** Escolha versão (NVI, ARA, ACF, etc), Livro, Capítulo e os versículos desejados, que são buscados rapidamente via API.
- **Paginação:** Agrupe múltiplos versículos por tela (ex: 3 versículos por vez) e passe os "slides" facilmente pelos botões de Anterior/Próximo.
- **Ajustes Rápidos:** Possibilidade de ajustar o Zoom rapidamente de dentro do próprio painel para melhorar a legibilidade no telão.

## 🚀 Recursos Principais
- **Gerenciamento Inteligente de Abas e Telas:** Botão para abrir o telão em uma janela limpa, que detecta automaticamente seu monitor secundário e pode iniciar já em Fullscreen.
- **Menu de Preferências (Global):** Personalize sua extensão ativando/desativando botões, definindo a resolução da janela, cor da fonte e níveis de zoom padrão para a Bíblia.
- **Armazenamento Seguro:** As imagens carregadas na mídia ficam seguras no seu armazenamento local, permitindo o carregamento de várias imagens em alta resolução.
- **Notificação Inteligente de Atualização:** A extensão verifica novidades e exibe uma notificação direto na sua tela, permitindo ver as melhorias e baixar a versão com um clique!

## 📦 Como Instalar a Extensão

1. **Baixe os arquivos:** Faça o download ou clone este repositório no seu computador e extraia os arquivos.
2. **Acesse as Extensões:** Abra o seu navegador (Chrome/Edge/Brave), digite na barra de endereços `chrome://extensions/` e pressione **Enter**.
3. **Modo do Desenvolvedor:** No canto superior direito, ative a chave **"Modo do desenvolvedor"** (Developer mode).
4. **Carregar a Extensão:** Clique no botão **"Carregar sem compactação"** (Load unpacked) no canto superior esquerdo.
5. **Selecione a Pasta:** Navegue até a pasta da extensão (que contém o `manifest.json`) e selecione-a.
6. **Fixe o ícone!** A extensão aparecerá na lista. Clique no ícone de "quebra-cabeça" 🧩 na barra do navegador e **fixe (pin)** o Projetor Igreja.

### 🔄 Como Atualizar a Extensão
1. Quando houver uma nova versão, a extensão enviará uma notificação no seu navegador avisando da atualização.
2. Clique no botão **Saiba Mais** na notificação para ver o que mudou e clique no botão de download.
3. Extraia o conteúdo do novo arquivo `projetor_igreja.zip`, substituindo os arquivos na mesma pasta que você usou para a instalação.
4. Vá em `chrome://extensions/` e clique no botão de **Recarregar (seta circular)** no card do Projetor Igreja. Pronto! A extensão já estará atualizada.

## 💻 Como Usar

1. Clique no ícone da extensão na barra superior para abrir o popup.
2. Clique no botão **"Abrir Telão"**. Uma tela escura se abrirá no seu segundo monitor (projetor).
3. **Para YouTube:** No seu navegador, abra um vídeo no YouTube, selecione a aba 🔴 YouTube no popup e clique em "Projetar Vídeo Atual".
4. **Para Mídia:** Selecione a aba 🖼️ Mídia, carregue as imagens que vai usar no culto e clique na imagem desejada para enviá-la ao telão instantaneamente.
5. **Para Bíblia:** Selecione a aba 📖 Bíblia, escolha o texto, os ajustes de formatação e clique em "Projetar". Navegue pelos versículos com os botões de Avançar/Voltar.
6. **(Dica)** Você pode clicar no ícone de "Engrenagem" ⚙️ para abrir as Preferências e deixar a extensão do seu jeito!

## 📄 Licença

Este projeto é de código aberto e está sob a licença [MIT](LICENSE). Sinta-se à vontade para usar, modificar e distribuir o código conforme necessário em sua congregação.