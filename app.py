"""
=====================================================
LIBRAS ACCESSIBILITY - Backend com Whisper
=====================================================

Servidor Flask que:
- Recebe áudio do navegador
- Transcreve com OpenAI Whisper
- Retorna texto para o frontend
"""

import os
import tempfile
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import whisper

app = Flask(__name__, static_folder='web', static_url_path='')
CORS(app)

# Carrega o modelo Whisper (use 'tiny' ou 'base' para ser mais rápido)
# Opções: tiny, base, small, medium, large
print("🔄 Carregando modelo Whisper...")
model = whisper.load_model("base")
print("✅ Modelo Whisper carregado!")

@app.route('/')
def index():
    """Serve a página principal"""
    return send_from_directory('web', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """Serve arquivos estáticos da pasta web"""
    return send_from_directory('web', path)

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Recebe áudio e retorna transcrição
    
    Espera um arquivo de áudio no campo 'audio'
    Retorna JSON: {"text": "transcrição aqui", "success": true}
    """
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "Nenhum arquivo de áudio enviado", "success": False}), 400
        
        audio_file = request.files['audio']
        
        # Salva o áudio temporariamente
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp:
            audio_file.save(tmp.name)
            tmp_path = tmp.name
        
        try:
            # Transcreve com Whisper
            result = model.transcribe(
                tmp_path,
                language='pt',  # Português
                fp16=False      # Compatibilidade com CPU
            )
            
            text = result['text'].strip()
            print(f"📝 Transcrito: {text}")
            
            return jsonify({
                "text": text,
                "success": True
            })
            
        finally:
            # Remove arquivo temporário
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    except Exception as e:
        print(f"❌ Erro na transcrição: {e}")
        return jsonify({
            "error": str(e),
            "success": False
        }), 500

@app.route('/health')
def health():
    """Endpoint de health check"""
    return jsonify({"status": "ok", "whisper": "loaded"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    print(f"""
🤟 ═══════════════════════════════════════════════════
   LIBRAS ACCESSIBILITY - Servidor com Whisper
═══════════════════════════════════════════════════════

   🌐 Acesse: http://localhost:{port}
   
   📝 Transcrição: POST /transcribe (envie áudio)
   ❤️  Health check: GET /health

═══════════════════════════════════════════════════════
""")
    app.run(host='0.0.0.0', port=port, debug=True)
