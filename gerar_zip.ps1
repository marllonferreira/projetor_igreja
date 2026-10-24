# ==============================================================================
# PROJETOR IGREJA - Script de Empacotamento para Distribuicao (Release)
# ==============================================================================

# Garante execucao no diretorio do script
Set-Location -Path $PSScriptRoot

# Ajusta codificacao do console para UTF-8
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

# Personaliza o titulo da janela
try {
    $Host.UI.RawUI.WindowTitle = "Projetor Igreja - Gerador de Pacote (Release)"
} catch {}

# Ajusta as dimensoes da janela (82 colunas de largura x 47 de altura)
try {
    $larguraDesejada = 82
    $alturaDesejada = 47

    $wSize = $Host.UI.RawUI.WindowSize
    $bSize = $Host.UI.RawUI.BufferSize

    # 1. Se a janela atual for mais larga que o desejado, reduz a janela primeiro
    if ($wSize.Width -gt $larguraDesejada) {
        $wSize.Width = $larguraDesejada
        $Host.UI.RawUI.WindowSize = $wSize
    }

    # 2. Ajusta a largura do buffer exatamente para a largura da janela (elimina barra de rolagem horizontal)
    $bSize.Width = $larguraDesejada
    $Host.UI.RawUI.BufferSize = $bSize

    # 3. Garante que a janela fique na largura desejada
    $wSize.Width = $larguraDesejada
    $Host.UI.RawUI.WindowSize = $wSize

    # 4. Ajusta a altura da janela e buffer para comportar 50 linhas
    if ($bSize.Height -lt 120) {
        $bSize.Height = 120
        $Host.UI.RawUI.BufferSize = $bSize
    }

    $maxAlt = $Host.UI.RawUI.MaxPhysicalWindowSize.Height
    if ($maxAlt -and $alturaDesejada -ge $maxAlt) {
        $alturaFinal = $maxAlt - 2
    } else {
        $alturaFinal = $alturaDesejada
    }

    $wSize.Height = $alturaFinal
    $Host.UI.RawUI.WindowSize = $wSize
} catch {
    # Ambientes restritos ou terminais incorporados ignoram sem falhas
}

# Limpa a tela e reseta a posicao do cursor para o inicio absoluto da linha
Clear-Host
try {
    [Console]::CursorLeft = 0
} catch {}

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Magenta
Write-Host "   PROJETOR IGREJA - GERADOR DE PACOTE DE DISTRIBUICAO           " -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Magenta
Write-Host ""

Start-Sleep -Milliseconds 900

# -- ETAPA 1: Identificacao da Versao --
Write-Host "[1/5] Lendo informacoes do manifesto..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 700

if (-not (Test-Path 'manifest.json')) {
    Write-Host ""
    Write-Host "[ERRO CRITICO] Arquivo 'manifest.json' nao encontrado na raiz do projeto!" -ForegroundColor Red
    exit 1
}

$manifest = Get-Content 'manifest.json' -Raw | ConvertFrom-Json
$versao = $manifest.version
Write-Host "  -> [OK] Versao oficial identificada: v$versao" -ForegroundColor Green
Write-Host ""

Start-Sleep -Milliseconds 1000

# -- ETAPA 2: Limpeza de Versoes Antigas --
$zipName = 'projetor_igreja.zip'
Write-Host "[2/5] Verificando se existe pacote anterior..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 700

if (Test-Path $zipName) {
    $tamanhoAntigo = [math]::Round(((Get-Item $zipName).Length / 1KB), 1)
    Write-Host "  -> [i]  Pacote antigo encontrado: $zipName ($tamanhoAntigo KB)" -ForegroundColor DarkYellow
    Start-Sleep -Milliseconds 500
    Remove-Item -Force $zipName -ErrorAction SilentlyContinue
    Write-Host "  -> [OK] Arquivo antigo excluido com sucesso para nova geracao." -ForegroundColor Yellow
} else {
    Write-Host "  -> [OK] Nenhum pacote anterior encontrado. Criando pacote do zero." -ForegroundColor DarkGray
}
Write-Host ""

Start-Sleep -Milliseconds 1000

# -- ETAPA 3: Selecao e Validacao dos Arquivos --
Write-Host "[3/5] Selecionando e validando os arquivos que entrarao no pacote..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 700

$itens = @(
    'manifest.json',
    'background.js',
    'content.js',
    'popup.html',
    'popup.js',
    'projetor.html',
    'projetor.js',
    'projetor_biblia.html',
    'projetor_biblia.js',
    'projetor_midia.html',
    'projetor_midia.js',
    'projetor_time.html',
    'projetor_time.js',
    'update.html',
    'update.js',
    'assets',
    'LICENSE',
    'Como Instalar.txt'
)

$itensValidados = @()
$itensFaltando = 0

foreach ($item in $itens) {
    if (Test-Path $item) {
        Write-Host "  + Adicionando: $item" -ForegroundColor Gray
        $itensValidados += $item
    } else {
        Write-Host "  ! Alerta: Item ausente ($item)" -ForegroundColor Yellow
        $itensFaltando++
    }
    Start-Sleep -Milliseconds 70
}

Write-Host ""
if ($itensFaltando -eq 0) {
    $totalItens = $itensValidados.Count
    Write-Host "  -> [OK] Total de $totalItens itens verificados e prontos para compressao." -ForegroundColor Green
}
Write-Host ""
Write-Host "  [i] Arquivos/pastas protegidos (ignorados do pacote):" -ForegroundColor DarkCyan
$itensIgnorados = @(
    'README.md',
    'release_notes.md',
    'doc/',
    'Planejamento Futuro/',
    'AGENTS.md',
    '.agents/'
)
foreach ($ignorado in $itensIgnorados) {
    Write-Host "      - $ignorado" -ForegroundColor DarkGray
    Start-Sleep -Milliseconds 60
}
Write-Host ""

Start-Sleep -Milliseconds 1200

# -- ETAPA 4: Compactacao ZIP --
Write-Host "[4/5] Comprimindo arquivos e gerando o pacote ZIP final..." -ForegroundColor Cyan
Write-Host "      Processando compressao, por favor aguarde..." -ForegroundColor DarkGray
Start-Sleep -Milliseconds 600

Compress-Archive -Path $itensValidados -DestinationPath $zipName -Force

Start-Sleep -Milliseconds 1000
Write-Host "  -> [OK] Compactacao finalizada!" -ForegroundColor Green
Write-Host ""

Start-Sleep -Milliseconds 900

# -- ETAPA 5: Resumo e Conclusao --
Write-Host "[5/5] Conferindo resultado final..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 700

if (Test-Path $zipName) {
    $itemZip = Get-Item $zipName
    $tamanhoKb = [math]::Round(($itemZip.Length / 1KB), 1)
    $tamanhoMb = [math]::Round(($itemZip.Length / 1MB), 2)
    $caminhoCompleto = $itemZip.FullName

    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host "   PACOTE GERADO COM SUCESSO!                                    " -ForegroundColor White
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host "   Nome do Arquivo:   $zipName" -ForegroundColor White
    Write-Host "   Versao Empacotada: v$versao" -ForegroundColor Cyan
    Write-Host "   Tamanho Final:     $tamanhoKb KB (~$tamanhoMb MB)" -ForegroundColor Yellow
    Write-Host "   Local do Pacote:   $caminhoCompleto" -ForegroundColor DarkGray
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "[ERRO] Nao foi possivel confirmar a criacao de '$zipName'." -ForegroundColor Red
}

# Pausa final interativa se nao for chamada redirecionada
if (-not [Console]::IsInputRedirected) {
    Write-Host "Pressione qualquer tecla para encerrar..." -ForegroundColor Gray
    try {
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    } catch { }
}
