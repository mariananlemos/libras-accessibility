/**
 * =====================================================
 * LIBRAS ACCESSIBILITY - VLibras Preload Script
 * =====================================================
 * 
 * Preload script para a janela isolada do VLibras.
 * Permite comunicação segura via IPC com a janela principal.
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expõe API segura para comunicação com o VLibras Bridge
 */
contextBridge.exposeInMainWorld('vlibrasAPI', {
  /**
   * Envia mensagem para o processo principal
   * @param {string} channel - Canal IPC
   * @param {any} data - Dados a enviar
   */
  send: (channel, data) => {
    const validChannels = [
      'vlibras-ready',
      'vlibras-translating',
      'vlibras-error'
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  /**
   * Recebe mensagem do processo principal
   * @param {string} channel - Canal IPC
   * @param {function} callback - Função de callback
   */
  receive: (channel, callback) => {
    const validChannels = [
      'translate-to-libras'
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  }
});

console.log('[VLibras Preload] API exposta com sucesso');
