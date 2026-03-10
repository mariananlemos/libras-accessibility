/**
 * =====================================================
 * LIBRAS ACCESSIBILITY - Preload Script
 * =====================================================
 * 
 * Este arquivo serve como ponte segura entre o processo principal
 * e o processo de renderização (renderer).
 * 
 * Por motivos de segurança, usamos contextBridge para expor apenas
 * as funcionalidades necessárias ao renderer, sem dar acesso direto
 * ao Node.js ou ao ipcRenderer completo.
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expõe uma API segura para o processo de renderização
 * Acessível via window.electronAPI no renderer
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Minimiza a janela do aplicativo
   */
  minimizeWindow: () => {
    ipcRenderer.send('minimize-window');
  },

  /**
   * Fecha a janela/aplicativo
   */
  closeWindow: () => {
    ipcRenderer.send('close-window');
  },

  /**
   * Alterna o estado "sempre no topo" da janela
   * @param {boolean} value - true para ativar, false para desativar
   */
  toggleAlwaysOnTop: (value) => {
    ipcRenderer.send('toggle-always-on-top', value);
  },

  /**
   * Define a opacidade da janela
   * @param {number} opacity - Valor entre 0 (transparente) e 1 (opaco)
   */
  setOpacity: (opacity) => {
    ipcRenderer.send('set-opacity', opacity);
  },

  /**
   * Registra um listener para mudanças no estado always on top
   * @param {Function} callback - Função chamada quando o estado muda
   */
  onAlwaysOnTopChanged: (callback) => {
    ipcRenderer.on('always-on-top-changed', (event, value) => {
      callback(value);
    });
  },

  // ==================== VLIBRAS API ====================

  /**
   * Envia texto para tradução no VLibras
   * @param {string} text - Texto para traduzir
   */
  translateToLibras: (text) => {
    ipcRenderer.send('translate-to-libras', text);
  },

  /**
   * Registra callback para quando o VLibras estiver pronto
   * @param {Function} callback - Função chamada quando VLibras está pronto
   */
  onVLibrasReady: (callback) => {
    ipcRenderer.on('vlibras-ready', (event, data) => {
      callback(data);
    });
  },

  /**
   * Registra callback para quando uma tradução iniciar
   * @param {Function} callback - Função chamada com o texto sendo traduzido
   */
  onVLibrasTranslating: (callback) => {
    ipcRenderer.on('vlibras-translating', (event, text) => {
      callback(text);
    });
  },

  /**
   * Registra callback para erros do VLibras
   * @param {Function} callback - Função chamada com a mensagem de erro
   */
  onVLibrasError: (callback) => {
    ipcRenderer.on('vlibras-error', (event, error) => {
      callback(error);
    });
  }
});

/**
 * Quando o DOM estiver pronto, podemos fazer inicializações adicionais
 */
window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload script carregado com sucesso!');
});
