/**
 * =====================================================
 * LIBRAS ACCESSIBILITY - Processo Principal (Main)
 * =====================================================
 * 
 * Este arquivo é o processo principal do Electron.
 * Ele é responsável por:
 * - Iniciar o servidor Express local
 * - Criar a janela da sala de reunião
 * - Gerenciar o ciclo de vida da aplicação
 * 
 * O VLibras funciona carregando a página via HTTP (servidor local),
 * evitando problemas de CSP/CORS do Electron com file://
 */

const { app, BrowserWindow, screen } = require('electron');
const { startServer, stopServer } = require('./server');

// Variável global para manter referência da janela principal
let mainWindow;
let serverPort = null;

/**
 * Cria a janela principal do aplicativo
 * Carrega a sala de reunião servida pelo Express local
 */
function createWindow() {
  // Obtém as dimensões da tela
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  
  // Dimensões da janela da sala de reunião (maior para acomodar vídeo + VLibras)
  const windowWidth = 1200;
  const windowHeight = 800;
  
  // Cria a janela do navegador
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    // Centraliza a janela
    x: Math.floor((screenWidth - windowWidth) / 2),
    y: Math.floor((screenHeight - windowHeight) / 2),
    // Configurações visuais
    frame: true, // Barra de título do sistema
    resizable: true,
    // Configurações de segurança
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Não precisa de preload para a sala de reunião web
      webSecurity: true, // Pode manter segurança pois está servindo via HTTP
    },
    hasShadow: true,
    backgroundColor: '#1a1a2e',
  });

  // Carrega a URL do servidor local (VLibras funciona normalmente via HTTP!)
  if (serverPort) {
    mainWindow.loadURL(`http://localhost:${serverPort}`);
    console.log(`[Main] Carregando http://localhost:${serverPort}`);
  } else {
    console.error('[Main] Servidor não iniciado!');
    mainWindow.loadFile('index.html'); // Fallback
  }

  // Evento quando a janela é fechada
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // DevTools em desenvolvimento
  // mainWindow.webContents.openDevTools({ mode: 'detach' });
}

/**
 * Eventos IPC - Comunicação entre processo principal e renderer
 */

// Minimiza a janela quando solicitado pelo renderer
/**
 * Eventos do ciclo de vida da aplicação
 */

// Quando o Electron terminar a inicialização
app.whenReady().then(async () => {
  try {
    // Inicia o servidor Express primeiro
    console.log('[Main] Iniciando servidor Express...');
    serverPort = await startServer();
    console.log(`[Main] Servidor pronto na porta ${serverPort}`);
    
    // Agora cria a janela que carrega a URL do servidor
    createWindow();

    // No macOS, recria a janela quando o ícone do dock é clicado
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('[Main] Erro ao iniciar servidor:', error);
    app.quit();
  }
});

// Fecha a aplicação quando todas as janelas forem fechadas (exceto no macOS)
app.on('window-all-closed', async () => {
  await stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Para o servidor ao sair da aplicação
app.on('before-quit', async () => {
  await stopServer();
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('Erro não capturado:', error);
});
