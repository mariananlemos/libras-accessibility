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
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});
