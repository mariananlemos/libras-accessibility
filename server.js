/**
 * =====================================================
 * LIBRAS ACCESSIBILITY - Servidor Local
 * =====================================================
 * 
 * Servidor Express que serve a aplicação web.
 * Necessário para que o VLibras funcione corretamente
 * (evita problemas de CSP/CORS do Electron).
 */

const express = require('express');
const path = require('path');

const app = express();
let server = null;

// Porta padrão (pode ser alterada se estiver em uso)
const DEFAULT_PORT = 3847;

/**
 * Inicia o servidor Express
 * @returns {Promise<number>} Porta em que o servidor está rodando
 */
function startServer() {
  return new Promise((resolve, reject) => {
    // Serve arquivos estáticos da pasta 'web'
    app.use(express.static(path.join(__dirname, 'web')));

    // Rota principal
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'web', 'index.html'));
    });

    // Tenta iniciar na porta padrão, se falhar tenta a próxima
    const tryPort = (port) => {
      server = app.listen(port, () => {
        console.log(`[Server] Servidor rodando em http://localhost:${port}`);
        resolve(port);
      }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`[Server] Porta ${port} em uso, tentando ${port + 1}...`);
          tryPort(port + 1);
        } else {
          reject(err);
        }
      });
    };

    tryPort(DEFAULT_PORT);
  });
}

/**
 * Para o servidor
 */
function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('[Server] Servidor finalizado');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = { startServer, stopServer, DEFAULT_PORT };
