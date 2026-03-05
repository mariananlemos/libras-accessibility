/**
 * =====================================================
 * LIBRAS ACCESSIBILITY - Processo Principal (Main)
 * =====================================================
 * 
 * Este arquivo é o processo principal do Electron.
 * Ele é responsável por:
 * - Criar a janela flutuante do aplicativo
 * - Gerenciar o ciclo de vida da aplicação
 * - Configurar as propriedades da janela (alwaysOnTop, transparência, etc.)
 */

const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

// Variável global para manter referência da janela principal
let mainWindow;

/**
 * Cria a janela principal do aplicativo
 * A janela é configurada para ser flutuante, semi-transparente e sempre no topo
 */
function createWindow() {
  // Obtém as dimensões da tela para posicionar a janela
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  
  // Dimensões da janela flutuante
  const windowWidth = 420;
  const windowHeight = 550;
  
  // Cria a janela do navegador com as configurações especificadas
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    // Posiciona a janela no canto inferior direito da tela
    x: screenWidth - windowWidth - 20,
    y: screenHeight - windowHeight - 20,
    // Configurações visuais
    frame: false, // Remove a barra de título padrão do sistema
    transparent: true, // Permite transparência no fundo
    alwaysOnTop: true, // IMPORTANTE: Mantém a janela sempre sobre outras (Google Meet, Teams, etc.)
    resizable: true, // Permite redimensionamento
    skipTaskbar: false, // Aparece na barra de tarefas
    // Configurações de segurança e funcionalidade
    webPreferences: {
      nodeIntegration: false, // Desabilita integração do Node por segurança
      contextIsolation: true, // Isola o contexto para maior segurança
      preload: path.join(__dirname, 'preload.js'), // Script de pré-carregamento
      webSecurity: false, // Desabilitado temporariamente para permitir VLibras
      allowRunningInsecureContent: true, // Permite conteúdo misto
    },
    // Configurações adicionais de aparência
    hasShadow: true, // Adiciona sombra à janela
    roundedCorners: true, // Bordas arredondadas (Windows 11)
    backgroundColor: '#00000000', // Fundo transparente
  });

  // Carrega o arquivo HTML da interface
  mainWindow.loadFile('index.html');

  // Define o nível de always on top para garantir que fique sobre todas as janelas
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  
  // Permite que a janela apareça em todos os workspaces (útil para Linux/Mac)
  mainWindow.setVisibleOnAllWorkspaces(true);

  // Evento quando a janela é fechada
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Abre as DevTools em modo de desenvolvimento (comente para produção)
  mainWindow.webContents.openDevTools({ mode: 'detach' });
}

/**
 * Eventos IPC - Comunicação entre processo principal e renderer
 */

// Minimiza a janela quando solicitado pelo renderer
ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

// Fecha a janela/aplicação quando solicitado
ipcMain.on('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// Alterna o estado always on top
ipcMain.on('toggle-always-on-top', (event, value) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(value, 'screen-saver');
    event.reply('always-on-top-changed', value);
  }
});

// Alterna a opacidade da janela
ipcMain.on('set-opacity', (event, opacity) => {
  if (mainWindow) {
    mainWindow.setOpacity(opacity);
  }
});

/**
 * Eventos do ciclo de vida da aplicação
 */

// Quando o Electron terminar a inicialização
app.whenReady().then(() => {
  createWindow();

  // No macOS, recria a janela quando o ícone do dock é clicado
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Fecha a aplicação quando todas as janelas forem fechadas (exceto no macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('Erro não capturado:', error);
});
