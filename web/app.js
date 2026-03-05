/**
 * =====================================================
 * LIBRAS ACCESSIBILITY - Sala de Reunião Acessível
 * =====================================================
 * 
 * Integração completa:
 * - WebRTC para câmera e microfone
 * - Web Speech API para transcrição
 * - VLibras Widget para tradução em Libras
 */

// ==================== CONFIGURAÇÃO ====================

const CONFIG = {
  recognition: {
    lang: 'pt-BR',
    continuous: true,
    interimResults: true,
    maxAlternatives: 1
  },
  translateDelay: 1500,
  mediaConstraints: {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user'
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  }
};

// ==================== ELEMENTOS DO DOM ====================

const elements = {
  // Tela de permissões
  permissionsScreen: document.getElementById('permissions-screen'),
  btnRequestPermissions: document.getElementById('btn-request-permissions'),
  permCameraStatus: document.getElementById('perm-camera-status'),
  permMicStatus: document.getElementById('perm-mic-status'),
  
  // Sala de reunião
  meetingRoom: document.getElementById('meeting-room'),
  meetingTime: document.getElementById('meeting-time'),
  btnLeave: document.getElementById('btn-leave'),
  
  // Vídeo
  localVideo: document.getElementById('local-video'),
  videoOffPlaceholder: document.getElementById('video-off-placeholder'),
  audioIndicator: document.getElementById('audio-indicator'),
  
  // Controles
  btnMic: document.getElementById('btn-mic'),
  btnCamera: document.getElementById('btn-camera'),
  btnTranscription: document.getElementById('btn-transcription'),
  btnLibras: document.getElementById('btn-libras'),
  
  // Status
  statusDot: document.getElementById('status-dot'),
  statusText: document.getElementById('status-text'),
  
  // VLibras
  vlibrasWrapper: document.getElementById('vlibras-wrapper'),
  vlibrasPlaceholder: document.getElementById('vlibras-placeholder'),
  vlibrasLoadingText: document.getElementById('vlibras-loading-text'),
  vlibrasBadge: document.getElementById('vlibras-badge'),
  
  // Legendas
  captionText: document.getElementById('caption-text'),
  captionInterim: document.getElementById('caption-interim'),
  captionsContent: document.getElementById('captions-content'),
  btnClearCaptions: document.getElementById('btn-clear-captions')
};

// ==================== ESTADO ====================

const state = {
  // Permissões
  permissionsGranted: false,
  
  // Mídia
  localStream: null,
  micEnabled: true,
  cameraEnabled: true,
  
  // Transcrição
  recognition: null,
  isTranscribing: false,
  currentText: '',
  lastTranslatedText: '',
  translateTimeout: null,
  
  // VLibras
  vlibrasReady: false,
  librasEnabled: true,
  
  // Reunião
  meetingStartTime: null,
  meetingTimer: null,
  
  // Áudio analyzer
  audioContext: null,
  audioAnalyser: null,
  audioAnimationId: null
};

// ==================== INICIALIZAÇÃO ====================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Sala de Reunião Acessível - Iniciando...');
  
  initEventListeners();
  checkBrowserSupport();
});

/**
 * Verifica suporte do navegador
 */
function checkBrowserSupport() {
  const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasSpeech = !!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  
  if (!hasMedia) {
    alert('Seu navegador não suporta acesso à câmera/microfone. Use Chrome ou Firefox.');
    return;
  }
  
  if (!hasSpeech) {
    console.warn('Web Speech API não suportada. Transcrição desabilitada.');
    elements.btnTranscription.disabled = true;
  }
  
  // Inicia verificação do VLibras
  initVLibras();
}

// ==================== PERMISSÕES E MÍDIA ====================

/**
 * Solicita permissões de câmera e microfone
 */
async function requestPermissions() {
  console.log('📹 Solicitando permissões...');
  elements.btnRequestPermissions.disabled = true;
  elements.btnRequestPermissions.textContent = '⏳ Aguarde...';
  
  try {
    // Solicita acesso aos dispositivos
    const stream = await navigator.mediaDevices.getUserMedia(CONFIG.mediaConstraints);
    
    state.localStream = stream;
    state.permissionsGranted = true;
    
    // Atualiza status das permissões
    updatePermissionStatus('camera', 'granted');
    updatePermissionStatus('mic', 'granted');
    
    console.log('✅ Permissões concedidas!');
    
    // Pequeno delay antes de entrar na sala
    setTimeout(() => {
      enterMeetingRoom();
    }, 500);
    
  } catch (error) {
    console.error('❌ Erro ao obter permissões:', error);
    
    if (error.name === 'NotAllowedError') {
      updatePermissionStatus('camera', 'denied');
      updatePermissionStatus('mic', 'denied');
      alert('Você precisa permitir o acesso à câmera e microfone para usar a sala de reunião.');
    } else if (error.name === 'NotFoundError') {
      alert('Nenhuma câmera ou microfone encontrado no seu dispositivo.');
    } else {
      alert('Erro ao acessar câmera/microfone: ' + error.message);
    }
    
    elements.btnRequestPermissions.disabled = false;
    elements.btnRequestPermissions.textContent = '🚀 Permitir e Entrar na Sala';
  }
}

/**
 * Atualiza o status visual das permissões
 */
function updatePermissionStatus(type, status) {
  const element = type === 'camera' ? elements.permCameraStatus : elements.permMicStatus;
  
  element.classList.remove('granted', 'denied');
  
  if (status === 'granted') {
    element.textContent = '✅ Permitido';
    element.classList.add('granted');
  } else if (status === 'denied') {
    element.textContent = '❌ Negado';
    element.classList.add('denied');
  } else {
    element.textContent = 'Aguardando';
  }
}

/**
 * Entra na sala de reunião
 */
function enterMeetingRoom() {
  console.log('🚪 Entrando na sala de reunião...');
  
  // Esconde tela de permissões, mostra sala
  elements.permissionsScreen.classList.add('hidden');
  elements.meetingRoom.classList.remove('hidden');
  
  // Configura o vídeo local
  setupLocalVideo();
  
  // Inicia o timer da reunião
  startMeetingTimer();
  
  // Configura o analyzer de áudio
  setupAudioAnalyser();
  
  // Inicializa reconhecimento de voz
  initSpeechRecognition();
  
  // Atualiza status
  updateStatus('idle', 'Pronto');
  
  console.log('✅ Sala de reunião iniciada!');
}

/**
 * Configura o vídeo local
 */
function setupLocalVideo() {
  if (state.localStream) {
    elements.localVideo.srcObject = state.localStream;
    elements.localVideo.play().catch(e => console.log('Autoplay blocked:', e));
  }
}

/**
 * Configura o analisador de áudio para visualização
 */
function setupAudioAnalyser() {
  if (!state.localStream) return;
  
  try {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = state.audioContext.createMediaStreamSource(state.localStream);
    state.audioAnalyser = state.audioContext.createAnalyser();
    state.audioAnalyser.fftSize = 256;
    source.connect(state.audioAnalyser);
    
    // Inicia animação do indicador de áudio
    animateAudioIndicator();
  } catch (error) {
    console.error('Erro ao configurar analisador de áudio:', error);
  }
}

/**
 * Anima o indicador de áudio baseado no volume
 */
function animateAudioIndicator() {
  if (!state.audioAnalyser || !state.micEnabled) {
    elements.audioIndicator.classList.remove('active');
    elements.audioIndicator.classList.add('muted');
    return;
  }
  
  const dataArray = new Uint8Array(state.audioAnalyser.frequencyBinCount);
  state.audioAnalyser.getByteFrequencyData(dataArray);
  
  // Calcula o volume médio
  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
  
  // Se há som significativo, ativa a animação
  if (average > 10) {
    elements.audioIndicator.classList.add('active');
    elements.audioIndicator.classList.remove('muted');
  } else {
    elements.audioIndicator.classList.remove('active');
  }
  
  state.audioAnimationId = requestAnimationFrame(animateAudioIndicator);
}

// ==================== CONTROLES ====================

/**
 * Toggle microfone
 */
function toggleMic() {
  if (!state.localStream) return;
  
  state.micEnabled = !state.micEnabled;
  
  // Muta/desmuta todas as tracks de áudio
  state.localStream.getAudioTracks().forEach(track => {
    track.enabled = state.micEnabled;
  });
  
  // Atualiza UI
  elements.btnMic.classList.toggle('mic-on', state.micEnabled);
  elements.btnMic.classList.toggle('mic-off', !state.micEnabled);
  elements.btnMic.querySelector('.control-icon').textContent = state.micEnabled ? '🎤' : '🔇';
  
  if (!state.micEnabled) {
    elements.audioIndicator.classList.add('muted');
    elements.audioIndicator.classList.remove('active');
  }
  
  console.log(`🎤 Microfone: ${state.micEnabled ? 'ligado' : 'desligado'}`);
}

/**
 * Toggle câmera
 */
function toggleCamera() {
  if (!state.localStream) return;
  
  state.cameraEnabled = !state.cameraEnabled;
  
  // Liga/desliga todas as tracks de vídeo
  state.localStream.getVideoTracks().forEach(track => {
    track.enabled = state.cameraEnabled;
  });
  
  // Atualiza UI
  elements.btnCamera.classList.toggle('camera-on', state.cameraEnabled);
  elements.btnCamera.classList.toggle('camera-off', !state.cameraEnabled);
  elements.btnCamera.querySelector('.control-icon').textContent = state.cameraEnabled ? '📷' : '📷';
  
  elements.videoOffPlaceholder.classList.toggle('visible', !state.cameraEnabled);
  
  console.log(`📷 Câmera: ${state.cameraEnabled ? 'ligada' : 'desligada'}`);
}

/**
 * Toggle transcrição
 */
function toggleTranscription() {
  if (state.isTranscribing) {
    stopTranscription();
  } else {
    startTranscription();
  }
}

/**
 * Toggle VLibras
 */
function toggleLibras() {
  state.librasEnabled = !state.librasEnabled;
  
  elements.btnLibras.classList.toggle('active', state.librasEnabled);
  
  // Mostra/esconde o widget do VLibras
  const vwWrapper = document.querySelector('.vw-plugin-wrapper');
  if (vwWrapper) {
    vwWrapper.style.display = state.librasEnabled ? 'block' : 'none';
  }
  
  console.log(`🤟 Libras: ${state.librasEnabled ? 'ativo' : 'desativado'}`);
}

// ==================== TIMER DA REUNIÃO ====================

/**
 * Inicia o timer da reunião
 */
function startMeetingTimer() {
  state.meetingStartTime = Date.now();
  
  state.meetingTimer = setInterval(() => {
    const elapsed = Date.now() - state.meetingStartTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    elements.meetingTime.textContent = 
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, 1000);
}

/**
 * Sai da reunião
 */
function leaveMeeting() {
  if (confirm('Deseja realmente sair da reunião?')) {
    // Para todas as tracks de mídia
    if (state.localStream) {
      state.localStream.getTracks().forEach(track => track.stop());
    }
    
    // Para o timer
    clearInterval(state.meetingTimer);
    
    // Para a animação de áudio
    cancelAnimationFrame(state.audioAnimationId);
    
    // Para a transcrição
    if (state.isTranscribing) {
      stopTranscription();
    }
    
    // Fecha o contexto de áudio
    if (state.audioContext) {
      state.audioContext.close();
    }
    
    // Recarrega a página
    window.location.reload();
  }
}

// ==================== VLIBRAS ====================

/**
 * Inicializa o VLibras
 */
function initVLibras() {
  console.log('🔄 Inicializando VLibras...');
  
  const checkVLibras = setInterval(() => {
    const vwWrapper = document.querySelector('.vw-plugin-wrapper');
    const vwAccess = document.querySelector('[vw-access-button]');
    
    if (vwWrapper || vwAccess) {
      clearInterval(checkVLibras);
      state.vlibrasReady = true;
      
      elements.vlibrasPlaceholder.classList.add('hidden');
      elements.vlibrasBadge.textContent = 'Pronto ✅';
      elements.vlibrasBadge.classList.add('ready');
      
      console.log('✅ VLibras carregado!');
      
      // Abre o widget automaticamente
      setTimeout(() => {
        if (vwAccess && !vwAccess.classList.contains('active')) {
          vwAccess.click();
        }
      }, 1000);
    }
  }, 500);
  
  // Timeout após 20 segundos
  setTimeout(() => {
    if (!state.vlibrasReady) {
      clearInterval(checkVLibras);
      elements.vlibrasLoadingText.textContent = 'VLibras não disponível';
      elements.vlibrasBadge.textContent = 'Erro';
      console.error('❌ Timeout ao carregar VLibras');
    }
  }, 20000);
}

/**
 * Traduz texto para Libras
 */
function translateToLibras(text) {
  if (!state.vlibrasReady || !state.librasEnabled || !text) return;
  if (text === state.lastTranslatedText) return;
  
  console.log('🤟 Traduzindo:', text.substring(0, 50) + '...');
  state.lastTranslatedText = text;
  
  // O VLibras captura automaticamente mudanças na página
  // Mas podemos forçar uma tradução tentando usar a API interna
  try {
    const vwAccess = document.querySelector('[vw-access-button]');
    if (vwAccess && !document.querySelector('.vw-plugin-wrapper.active')) {
      vwAccess.click();
    }
    
    // Tenta encontrar o input de texto do VLibras
    setTimeout(() => {
      const textInput = document.querySelector('.vw-plugin-top-wrapper input, .vp-input');
      if (textInput) {
        textInput.value = text;
        textInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        const playBtn = document.querySelector('.vw-btn-play, .vp-play, [title="Traduzir"]');
        if (playBtn) {
          playBtn.click();
        }
      }
    }, 300);
  } catch (e) {
    console.log('Tradução automática do VLibras');
  }
}

// ==================== RECONHECIMENTO DE VOZ ====================

/**
 * Inicializa o Web Speech API
 */
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.error('Web Speech API não suportada');
    return;
  }
  
  state.recognition = new SpeechRecognition();
  state.recognition.lang = CONFIG.recognition.lang;
  state.recognition.continuous = CONFIG.recognition.continuous;
  state.recognition.interimResults = CONFIG.recognition.interimResults;
  state.recognition.maxAlternatives = CONFIG.recognition.maxAlternatives;
  
  // Eventos
  state.recognition.onstart = () => {
    console.log('🎤 Transcrição iniciada');
    state.isTranscribing = true;
    updateTranscriptionUI();
    updateStatus('listening', 'Transcrevendo...');
  };
  
  state.recognition.onend = () => {
    console.log('🎤 Transcrição pausada');
    
    // Reinicia automaticamente se ainda deve estar transcrevendo
    if (state.isTranscribing) {
      try {
        setTimeout(() => {
          if (state.isTranscribing) {
            state.recognition.start();
          }
        }, 100);
      } catch (e) {
        console.log('Reiniciando transcrição...');
      }
    } else {
      updateStatus('idle', 'Pronto');
      updateTranscriptionUI();
    }
  };
  
  state.recognition.onerror = (event) => {
    console.error('Erro na transcrição:', event.error);
    
    if (event.error === 'no-speech') {
      // Normal, não mostra erro
      return;
    }
    
    if (event.error === 'not-allowed') {
      updateStatus('error', 'Microfone não permitido');
      state.isTranscribing = false;
      updateTranscriptionUI();
      return;
    }
    
    if (event.error === 'aborted') {
      return;
    }
    
    updateStatus('error', `Erro: ${event.error}`);
  };
  
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
    
    // Atualiza texto provisório
    if (interimTranscript) {
      elements.captionInterim.textContent = interimTranscript;
    }
    
    // Processa texto final
    if (finalTranscript) {
      processTranscript(finalTranscript);
    }
  };
  
  console.log('✅ Speech Recognition inicializado');
}

/**
 * Processa o texto transcrito
 */
function processTranscript(text) {
  const cleanText = text.trim();
  if (!cleanText) return;
  
  console.log('📝 Transcrito:', cleanText);
  
  // Adiciona ao texto atual
  if (state.currentText) {
    state.currentText += ' ' + cleanText;
  } else {
    state.currentText = cleanText;
  }
  
  // Atualiza UI
  elements.captionText.textContent = state.currentText;
  elements.captionInterim.textContent = '';
  
  // Auto scroll
  elements.captionsContent.scrollTop = elements.captionsContent.scrollHeight;
  
  // Agenda tradução para Libras
  clearTimeout(state.translateTimeout);
  state.translateTimeout = setTimeout(() => {
    translateToLibras(state.currentText);
  }, CONFIG.translateDelay);
}

/**
 * Inicia a transcrição
 */
function startTranscription() {
  if (!state.recognition) {
    alert('Reconhecimento de voz não disponível neste navegador.');
    return;
  }
  
  if (!state.micEnabled) {
    alert('Ligue o microfone para usar a transcrição.');
    return;
  }
  
  try {
    state.recognition.start();
  } catch (error) {
    console.error('Erro ao iniciar transcrição:', error);
    // Já está rodando, para e reinicia
    state.recognition.stop();
    setTimeout(() => {
      try {
        state.recognition.start();
      } catch (e) {
        console.error('Erro ao reiniciar:', e);
      }
    }, 100);
  }
}

/**
 * Para a transcrição
 */
function stopTranscription() {
  state.isTranscribing = false;
  
  if (state.recognition) {
    try {
      state.recognition.stop();
    } catch (e) {
      // Já estava parado
    }
  }
  
  updateTranscriptionUI();
  updateStatus('idle', 'Pronto');
}

/**
 * Limpa as legendas
 */
function clearCaptions() {
  state.currentText = '';
  state.lastTranslatedText = '';
  elements.captionText.textContent = 'As legendas aparecerão aqui quando você começar a falar...';
  elements.captionInterim.textContent = '';
  clearTimeout(state.translateTimeout);
}

/**
 * Atualiza UI de transcrição
 */
function updateTranscriptionUI() {
  elements.btnTranscription.classList.toggle('transcribing', state.isTranscribing);
  elements.btnTranscription.querySelector('.control-icon').textContent = state.isTranscribing ? '💬' : '💬';
}

// ==================== UI ====================

/**
 * Atualiza indicador de status
 */
function updateStatus(type, text) {
  elements.statusText.textContent = text;
  
  elements.statusDot.classList.remove('listening', 'error');
  
  if (type === 'listening') {
    elements.statusDot.classList.add('listening');
  } else if (type === 'error') {
    elements.statusDot.classList.add('error');
  }
}

// ==================== EVENT LISTENERS ====================

function initEventListeners() {
  // Permissões
  elements.btnRequestPermissions.addEventListener('click', requestPermissions);
  
  // Controles
  elements.btnMic.addEventListener('click', toggleMic);
  elements.btnCamera.addEventListener('click', toggleCamera);
  elements.btnTranscription.addEventListener('click', toggleTranscription);
  elements.btnLibras.addEventListener('click', toggleLibras);
  
  // Legendas
  elements.btnClearCaptions.addEventListener('click', clearCaptions);
  
  // Sair
  elements.btnLeave.addEventListener('click', leaveMeeting);
  
  // Atalhos de teclado
  document.addEventListener('keydown', (e) => {
    // Só funciona se estiver na sala
    if (elements.meetingRoom.classList.contains('hidden')) return;
    
    // M = toggle microfone
    if (e.code === 'KeyM' && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      toggleMic();
    }
    
    // V = toggle câmera
    if (e.code === 'KeyV' && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      toggleCamera();
    }
    
    // T = toggle transcrição
    if (e.code === 'KeyT' && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      toggleTranscription();
    }
    
    // L = toggle Libras
    if (e.code === 'KeyL' && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      toggleLibras();
    }
    
    // Escape = sair
    if (e.code === 'Escape') {
      leaveMeeting();
    }
  });
}
