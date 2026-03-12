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
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
let server = null;

// Porta padrão (pode ser alterada se estiver em uso)
const DEFAULT_PORT = 3847;
const FLASK_PORT = process.env.FLASK_PORT || 5000;

/**
 * Inicia o servidor Express
 * @returns {Promise<number>} Porta em que o servidor está rodando
 */
function startServer() {
  return new Promise((resolve, reject) => {
    // CSP que permite carregar o VLibras de vlibras.gov.br
    app.use((req, res, next) => {
      res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vlibras.gov.br",
        "style-src 'self' 'unsafe-inline'",
        "connect-src 'self' https://vlibras.gov.br wss://vlibras.gov.br ws://vlibras.gov.br",
        "frame-src 'self' https://vlibras.gov.br",
        "img-src 'self' https://vlibras.gov.br data: blob:",
        "media-src 'self' blob: mediastream:",
        "worker-src 'self' blob:",
        "font-src 'self' https://vlibras.gov.br data:"
      ].join('; '));
      next();
    });

    // Proxy para rota de transcrição -> Flask backend
    app.use('/transcribe', createProxyMiddleware({
      target: `http://localhost:${FLASK_PORT}`,
      changeOrigin: true
    }));

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
