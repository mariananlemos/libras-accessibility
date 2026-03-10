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
