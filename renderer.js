/**
 * =====================================================
 * LIBRAS ACCESSIBILITY - Renderer Script
 * =====================================================
 * 
 * Integração com VLibras Widget oficial
 * Web Speech API para transcrição
 */

// ==================== CONFIGURAÇÃO ====================

const CONFIG = {
  recognition: {
    lang: 'pt-BR',
    continuous: true,
    interimResults: true,
    maxAlternatives: 1
  },
  translateDelay: 1000 // Delay antes de enviar para VLibras
};

// ==================== ELEMENTOS DO DOM ====================

const elements = {
  btnPin: document.getElementById('btn-pin'),
  btnMinimize: document.getElementById('btn-minimize'),
  btnClose: document.getElementById('btn-close'),
  btnTranscribe: document.getElementById('btn-transcribe'),
  btnClear: document.getElementById('btn-clear'),
  statusDot: document.getElementById('status-dot'),
  statusText: document.getElementById('status-text'),
  vlibrasStatus: document.getElementById('vlibras-status'),
  subtitleText: document.getElementById('subtitle-text'),
  interimText: document.getElementById('interim-text'),
  subtitleBox: document.getElementById('subtitle-box'),
  historyHeader: document.getElementById('history-header'),
  historyContent: document.getElementById('history-content'),
  historyToggle: document.getElementById('history-toggle'),
  historyList: document.getElementById('history-list'),
  opacitySlider: document.getElementById('opacity-slider'),
  vlibrasPlaceholder: document.getElementById('vlibras-placeholder')
};

// ==================== ESTADO ====================

const state = {
  isRecording: false,
  isPinned: true,
  recognition: null,
  vlibrasReady: false,
  translateTimeout: null,
  currentSentence: '',
  historyCollapsed: false,
  lastTranslatedText: ''
};

// ==================== VLIBRAS ====================

/**
 * Aguarda o VLibras estar pronto (via IPC)
 */
function waitForVLibras() {
  console.log('🔄 Aguardando VLibras (via janela isolada)...');
  updateVLibrasStatus('Conectando ao VLibras...');
  
  // Escuta eventos do VLibras via IPC
  if (window.electronAPI) {
    window.electronAPI.onVLibrasReady((ready) => {
      state.vlibrasReady = true;
      hideVLibrasPlaceholder();
      updateVLibrasStatus('VLibras pronto! ✅');
      console.log('✅ VLibras conectado via IPC!');
    });
    
    window.electronAPI.onVLibrasTranslating((text) => {
      console.log('📤 VLibras traduzindo:', text);
    });
    
    window.electronAPI.onVLibrasError((error) => {
      console.error('❌ Erro no VLibras:', error);
      updateVLibrasStatus('Erro no VLibras: ' + error);
    });
  } else {
    console.warn('⚠️ electronAPI não disponível');
    updateVLibrasStatus('IPC não disponível');
  }
}

function hideVLibrasPlaceholder() {
  if (elements.vlibrasPlaceholder) {
    elements.vlibrasPlaceholder.style.opacity = '0';
    setTimeout(() => {
      elements.vlibrasPlaceholder.style.display = 'none';
    }, 300);
  }
}

function updateVLibrasStatus(message) {
  if (elements.vlibrasStatus) {
    elements.vlibrasStatus.textContent = message;
  }
  console.log(`[VLibras] ${message}`);
}

/**
 * Envia texto para o VLibras traduzir via IPC
 * Usa a janela isolada do VLibras para evitar problemas de CSP
 */
function translateToLibras(text) {
  if (!text || text.trim() === '') return;
  if (text === state.lastTranslatedText) return;
  
  state.lastTranslatedText = text;
  console.log('📤 Enviando para VLibras (via IPC):', text);
  
  if (state.translateTimeout) {
    clearTimeout(state.translateTimeout);
  }
  
  state.translateTimeout = setTimeout(() => {
    try {
      // Envia para a janela VLibras via IPC
      if (window.electronAPI && window.electronAPI.translateToLibras) {
        window.electronAPI.translateToLibras(text);
        console.log('✅ Texto enviado via IPC');
      } else {
        console.warn('⚠️ electronAPI.translateToLibras não disponível');
      }
    } catch (error) {
      console.error('❌ Erro ao traduzir:', error);
    }
  }, CONFIG.translateDelay);
}

// ==================== SPEECH RECOGNITION ====================

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.error('❌ Web Speech API não suportada');
    updateStatus('Navegador não suportado', true);
    if (elements.btnTranscribe) elements.btnTranscribe.disabled = true;
    return false;
  }
  
  state.recognition = new SpeechRecognition();
  state.recognition.lang = CONFIG.recognition.lang;
  state.recognition.continuous = CONFIG.recognition.continuous;
  state.recognition.interimResults = CONFIG.recognition.interimResults;
  state.recognition.maxAlternatives = CONFIG.recognition.maxAlternatives;
  
  state.recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    
    if (elements.interimText) {
      elements.interimText.textContent = interimTranscript;
    }
    
    if (finalTranscript) {
      state.currentSentence = finalTranscript;
      if (elements.subtitleText) {
        elements.subtitleText.textContent = finalTranscript;
      }
      if (elements.interimText) {
        elements.interimText.textContent = '';
      }
      
      addToHistory(finalTranscript);
      translateToLibras(finalTranscript);
      
      if (elements.subtitleBox) {
        elements.subtitleBox.scrollTop = elements.subtitleBox.scrollHeight;
      }
      
      console.log('🎤 Transcrito:', finalTranscript);
    }
  };
  
  state.recognition.onstart = () => {
    console.log('🎙️ Ouvindo...');
    updateStatus('Ouvindo...', false, true);
  };
  
  state.recognition.onend = () => {
    if (state.isRecording) {
      setTimeout(() => {
        if (state.isRecording && state.recognition) {
          try {
            state.recognition.start();
          } catch (e) {
            console.log('Reiniciando...');
          }
        }
      }, 100);
    } else {
      updateStatus('Pausado', false);
    }
  };
  
  state.recognition.onerror = (event) => {
    console.error('❌ Erro:', event.error);
    
    switch (event.error) {
      case 'no-speech':
        break;
      case 'audio-capture':
        updateStatus('Microfone não encontrado', true);
        stopRecording();
        break;
      case 'not-allowed':
        updateStatus('Permissão negada', true);
        stopRecording();
        break;
      case 'network':
        updateStatus('Erro de rede', true);
        break;
      default:
        updateStatus(`Erro: ${event.error}`, true);
    }
  };
  
  state.recognition.onspeechstart = () => {
    updateStatus('Transcrevendo...', false, true);
  };
  
  console.log('✅ Speech Recognition pronto');
  return true;
}

function startRecording() {
  if (!state.recognition && !initSpeechRecognition()) return;
  
  try {
    state.recognition.start();
    state.isRecording = true;
    
    if (elements.btnTranscribe) {
      elements.btnTranscribe.classList.add('recording');
      const btnText = elements.btnTranscribe.querySelector('.btn-text');
      const btnIcon = elements.btnTranscribe.querySelector('.btn-icon');
      if (btnText) btnText.textContent = 'Pausar';
      if (btnIcon) btnIcon.textContent = '⏸️';
    }
    
    console.log('▶️ Gravação iniciada');
  } catch (error) {
    console.error('Erro ao iniciar:', error);
    updateStatus('Erro ao iniciar', true);
  }
}

function stopRecording() {
  if (state.recognition) {
    state.isRecording = false;
    state.recognition.stop();
    
    if (elements.btnTranscribe) {
      elements.btnTranscribe.classList.remove('recording');
      const btnText = elements.btnTranscribe.querySelector('.btn-text');
      const btnIcon = elements.btnTranscribe.querySelector('.btn-icon');
      if (btnText) btnText.textContent = 'Iniciar Transcrição';
      if (btnIcon) btnIcon.textContent = '🎤';
    }
    
    updateStatus('Pausado', false);
    console.log('⏸️ Pausado');
  }
}

function toggleRecording() {
  state.isRecording ? stopRecording() : startRecording();
}

// ==================== FUNÇÕES AUXILIARES ====================

function updateStatus(text, isError = false, isListening = false) {
  if (elements.statusText) elements.statusText.textContent = text;
  if (elements.statusDot) {
    elements.statusDot.classList.remove('listening', 'error');
    if (isError) elements.statusDot.classList.add('error');
    else if (isListening) elements.statusDot.classList.add('listening');
  }
}

function addToHistory(text) {
  if (!text?.trim() || !elements.historyList) return;
  
  const li = document.createElement('li');
  li.textContent = text;
  li.title = text;
  elements.historyList.insertBefore(li, elements.historyList.firstChild);
  
  while (elements.historyList.children.length > 20) {
    elements.historyList.removeChild(elements.historyList.lastChild);
  }
}

function clearSubtitles() {
  if (elements.subtitleText) elements.subtitleText.textContent = 'As legendas aparecerão aqui...';
  if (elements.interimText) elements.interimText.textContent = '';
  state.currentSentence = '';
  state.lastTranslatedText = '';
}

function toggleHistory() {
  state.historyCollapsed = !state.historyCollapsed;
  elements.historyContent?.classList.toggle('collapsed', state.historyCollapsed);
  elements.historyToggle?.classList.toggle('collapsed', state.historyCollapsed);
}

function togglePin() {
  state.isPinned = !state.isPinned;
  elements.btnPin?.classList.toggle('active', state.isPinned);
  window.electronAPI?.toggleAlwaysOnTop(state.isPinned);
}

// ==================== INICIALIZAÇÃO ====================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Libras Accessibility iniciando...');
  
  // Aguarda o VLibras carregar
  waitForVLibras();
  
  // Inicializa Speech Recognition
  initSpeechRecognition();
  
  // Event Listeners
  elements.btnTranscribe?.addEventListener('click', toggleRecording);
  elements.btnClear?.addEventListener('click', clearSubtitles);
  elements.btnPin?.addEventListener('click', togglePin);
  elements.btnMinimize?.addEventListener('click', () => window.electronAPI?.minimizeWindow());
  elements.btnClose?.addEventListener('click', () => window.electronAPI?.closeWindow());
  elements.historyHeader?.addEventListener('click', toggleHistory);
  
  elements.opacitySlider?.addEventListener('input', (e) => {
    window.electronAPI?.setOpacity(e.target.value / 100);
  });
  
  // Atalhos de teclado
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.code === 'Space') {
      e.preventDefault();
      toggleRecording();
    }
    if (e.code === 'Escape') window.electronAPI?.minimizeWindow();
  });
  
  updateStatus('Pronto', false);
  console.log('✅ Aplicação pronta!');
});

// Tratamento de erros
window.onerror = (msg, src, line, col, err) => console.error('❌ Erro:', msg, err);
