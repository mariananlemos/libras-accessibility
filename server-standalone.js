/**
 * =====================================================
 * LIBRAS ACCESSIBILITY - Servidor Standalone
 * =====================================================
 * 
 * Servidor Express independente para rodar a versão web
 * sem precisar do Electron. Útil para:
 * - Testar no GitHub Codespaces
 * - Rodar em qualquer servidor web
 * - Desenvolvimento sem Electron
 * 
 * Uso: npm run web
 * 
 * IMPORTANTE: Iniciar também o backend Flask (python app.py)
 * para usar a transcrição com Whisper
 */

const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const FLASK_PORT = process.env.FLASK_PORT || 5000;

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

// Inicia o servidor
app.listen(PORT, () => {
  console.log('');
  console.log('🤟 ═══════════════════════════════════════════════════');
  console.log('   LIBRAS ACCESSIBILITY - Servidor Web');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log(`   🌐 Acesse: http://localhost:${PORT}`);
  console.log('');
  console.log('   📝 No Codespaces: A porta será encaminhada automaticamente');
  console.log('      Clique na aba "PORTS" e abra a URL gerada');
  console.log('');
  console.log('   ⚡ O VLibras carregará normalmente via HTTP');
  console.log('');
  console.log('   🎙️ Para transcrição com Whisper:');
  console.log('      1. pip install -r requirements.txt');
  console.log('      2. python app.py');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});
