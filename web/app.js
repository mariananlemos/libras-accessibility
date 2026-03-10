/**
 * =====================================================
 * LIBRAS ACCESSIBILITY - Sala de Reunião Acessível
 * =====================================================
 * 
 * Integração:
 * - WebRTC para câmera e microfone
 * - Whisper (via backend Flask) para transcrição
 * - VLibras Widget para tradução em Libras
 */

// ==================== CONFIGURAÇÃO ====================

const CONFIG = {
  whisperEndpoint: '/transcribe',
  recordingInterval: 3000, // Grava em chunks de 3 segundos
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
  
  // Gravação/Transcrição (Whisper)
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,
  recordingTimer: null,
  
  // VLibras
  vlibrasReady: false,
  librasEnabled: true,
  lastTranslatedText: '',
  
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
 * Configura os event listeners
 */
function initEventListeners() {
  // Botão de permissões
  if (elements.btnRequestPermissions) {
    elements.btnRequestPermissions.addEventListener('click', requestPermissions);
  }
  
  // Controles da reunião
  if (elements.btnMic) elements.btnMic.addEventListener('click', toggleMic);
  if (elements.btnCamera) elements.btnCamera.addEventListener('click', toggleCamera);
  if (elements.btnTranscription) elements.btnTranscription.addEventListener('click', toggleTranscription);
  if (elements.btnLibras) elements.btnLibras.addEventListener('click', toggleLibras);
  if (elements.btnLeave) elements.btnLeave.addEventListener('click', leaveMeeting);
  if (elements.btnClearCaptions) elements.btnClearCaptions.addEventListener('click', clearCaptions);
}

/**
 * Verifica suporte do navegador
 */
function checkBrowserSupport() {
  const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasRecorder = typeof MediaRecorder !== 'undefined';
  
  if (!hasMedia) {
    alert('Seu navegador não suporta acesso à câmera/microfone. Use Chrome ou Firefox.');
    return;
  }
  
  if (!hasRecorder) {
    console.warn('MediaRecorder não suportado.');
  }
  
  // Inicia verificação do VLibras
  initVLibras();
}

// ==================== VLIBRAS ====================

/**
 * Inicializa o VLibras (já está no HTML dentro do wrapper)
 */
function initVLibras() {
  console.log('🔄 Inicializando VLibras...');
  
  const checkVLibras = setInterval(() => {
    const vwAccess = document.querySelector('.vlibras-wrapper [vw-access-button]');
    const vwWrapper = document.querySelector('.vlibras-wrapper .vw-plugin-wrapper');
    
    if (vwWrapper && vwAccess) {
      clearInterval(checkVLibras);
      state.vlibrasReady = true;
      
      // Esconde o placeholder
      if (elements.vlibrasPlaceholder) {
        elements.vlibrasPlaceholder.classList.add('hidden');
      }
      if (elements.vlibrasBadge) {
        elements.vlibrasBadge.textContent = 'Pronto ✅';
        elements.vlibrasBadge.classList.add('ready');
      }
      
      console.log('✅ VLibras carregado!');
      
      // Abre o widget automaticamente
      setTimeout(() => {
        vwAccess.click();
        console.log('🎬 VLibras player aberto');
      }, 500);
    }
  }, 500);
  
  // Timeout após 15 segundos
  setTimeout(() => {
    if (!state.vlibrasReady) {
      clearInterval(checkVLibras);
      if (elements.vlibrasLoadingText) {
        elements.vlibrasLoadingText.textContent = 'VLibras não disponível';
      }
      if (elements.vlibrasBadge) {
        elements.vlibrasBadge.textContent = 'Offline';
      }
      console.error('❌ Timeout ao carregar VLibras');
    }
  }, 15000);
}

/**
 * Envia texto para tradução no VLibras
 */
function translateToLibras(text) {
  if (!state.vlibrasReady || !state.librasEnabled || !text) return;
  if (text === state.lastTranslatedText) return;
  
  state.lastTranslatedText = text;
  console.log('🤟 Traduzindo para Libras:', text);
  
  try {
    // Encontra o campo de texto do VLibras
    const textArea = document.querySelector('.vw-plugin-wrapper textarea, .vw-text-input, .vp-input');
    const textInput = document.querySelector('.vw-plugin-wrapper input[type="text"]');
    const inputField = textArea || textInput;
    
    if (inputField) {
      inputField.value = text;
      inputField.dispatchEvent(new Event('input', { bubbles: true }));
      inputField.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Procura e clica no botão de traduzir
      setTimeout(() => {
        const translateBtn = document.querySelector(
          '.vw-btn-send, .vw-send, .vp-play, [title="Traduzir"], button[type="submit"]'
        );
        if (translateBtn) {
          translateBtn.click();
          console.log('✅ Texto enviado para VLibras');
        } else {
          // Tenta Enter
          inputField.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true
          }));
        }
      }, 200);
    } else {
      console.log('⚠️ Campo de entrada do VLibras não encontrado');
    }
  } catch (e) {
    console.error('Erro ao traduzir:', e);
  }
}

// ==================== PERMISSÕES E MÍDIA ====================

async function requestPermissions() {
  console.log('📹 Solicitando permissões...');
  elements.btnRequestPermissions.disabled = true;
  elements.btnRequestPermissions.textContent = '⏳ Aguarde...';
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia(CONFIG.mediaConstraints);
    
    state.localStream = stream;
    state.permissionsGranted = true;
    
    updatePermissionStatus('camera', 'granted');
    updatePermissionStatus('mic', 'granted');
    
    console.log('✅ Permissões concedidas!');
    
    setTimeout(() => enterMeetingRoom(), 500);
    
  } catch (error) {
    console.error('❌ Erro ao obter permissões:', error);
    
    // Tenta só com áudio se não tiver câmera
    if (error.name === 'NotFoundError' || error.name === 'NotReadableError') {
      try {
        console.log('📹 Tentando somente microfone...');
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: CONFIG.mediaConstraints.audio });
        state.localStream = audioStream;
        state.permissionsGranted = true;
        state.cameraEnabled = false;
        
        updatePermissionStatus('camera', 'denied');
        updatePermissionStatus('mic', 'granted');
        
        setTimeout(() => enterMeetingRoom(), 500);
        return;
      } catch (audioError) {
        console.error('Erro também com áudio:', audioError);
      }
    }
    
    if (error.name === 'NotAllowedError') {
      updatePermissionStatus('camera', 'denied');
      updatePermissionStatus('mic', 'denied');
      alert('Você precisa permitir o acesso ao microfone para usar a transcrição.');
    } else {
      alert('Erro ao acessar dispositivos: ' + error.message);
    }
    
    elements.btnRequestPermissions.disabled = false;
    elements.btnRequestPermissions.textContent = '🚀 Permitir e Entrar na Sala';
  }
}

function updatePermissionStatus(type, status) {
  const element = type === 'camera' ? elements.permCameraStatus : elements.permMicStatus;
  if (!element) return;
  
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

function enterMeetingRoom() {
  console.log('🚪 Entrando na sala de reunião...');
  
  elements.permissionsScreen.classList.add('hidden');
  elements.meetingRoom.classList.remove('hidden');
  
  setupLocalVideo();
  startMeetingTimer();
  setupAudioAnalyser();
  
  updateStatus('idle', 'Pronto - Clique em Transcrição');
  
  console.log('✅ Sala de reunião iniciada!');
}

function setupLocalVideo() {
  if (state.localStream && state.cameraEnabled) {
    elements.localVideo.srcObject = state.localStream;
    elements.localVideo.play().catch(e => console.log('Autoplay blocked:', e));
  } else {
    elements.videoOffPlaceholder.classList.add('visible');
  }
}

function setupAudioAnalyser() {
  if (!state.localStream) return;
  
  try {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = state.audioContext.createMediaStreamSource(state.localStream);
    state.audioAnalyser = state.audioContext.createAnalyser();
    state.audioAnalyser.fftSize = 256;
    source.connect(state.audioAnalyser);
    
    animateAudioIndicator();
  } catch (error) {
    console.error('Erro ao configurar analisador de áudio:', error);
  }
}

function animateAudioIndicator() {
  if (!state.audioAnalyser || !state.micEnabled) {
    elements.audioIndicator?.classList.remove('active');
    elements.audioIndicator?.classList.add('muted');
    return;
  }
  
  const dataArray = new Uint8Array(state.audioAnalyser.frequencyBinCount);
  state.audioAnalyser.getByteFrequencyData(dataArray);
  
  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
  
  if (average > 10) {
    elements.audioIndicator?.classList.add('active');
    elements.audioIndicator?.classList.remove('muted');
  } else {
    elements.audioIndicator?.classList.remove('active');
  }
  
  state.audioAnimationId = requestAnimationFrame(animateAudioIndicator);
}

// ==================== CONTROLES ====================

function toggleMic() {
  if (!state.localStream) return;
  
  state.micEnabled = !state.micEnabled;
  
  state.localStream.getAudioTracks().forEach(track => {
    track.enabled = state.micEnabled;
  });
  
  elements.btnMic.classList.toggle('mic-on', state.micEnabled);
  elements.btnMic.classList.toggle('mic-off', !state.micEnabled);
  elements.btnMic.querySelector('.control-icon').textContent = state.micEnabled ? '🎤' : '🔇';
  
  console.log(`🎤 Microfone: ${state.micEnabled ? 'ligado' : 'desligado'}`);
}

function toggleCamera() {
  if (!state.localStream) return;
  
  state.cameraEnabled = !state.cameraEnabled;
  
  state.localStream.getVideoTracks().forEach(track => {
    track.enabled = state.cameraEnabled;
  });
  
  elements.btnCamera.classList.toggle('camera-on', state.cameraEnabled);
  elements.btnCamera.classList.toggle('camera-off', !state.cameraEnabled);
  elements.videoOffPlaceholder?.classList.toggle('visible', !state.cameraEnabled);
  
  console.log(`📷 Câmera: ${state.cameraEnabled ? 'ligada' : 'desligada'}`);
}

function toggleTranscription() {
  if (state.isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function toggleLibras() {
  state.librasEnabled = !state.librasEnabled;
  elements.btnLibras?.classList.toggle('active', state.librasEnabled);
  console.log(`🤟 Libras: ${state.librasEnabled ? 'ativo' : 'desativado'}`);
}

function clearCaptions() {
  if (elements.captionText) {
    elements.captionText.textContent = 'As legendas aparecerão aqui...';
  }
  if (elements.captionInterim) {
    elements.captionInterim.textContent = '';
  }
}

// ==================== GRAVAÇÃO + WHISPER ====================

/**
 * Inicia gravação de áudio para enviar ao Whisper
 */
function startRecording() {
  if (!state.localStream) {
    alert('Microfone não disponível');
    return;
  }
  
  console.log('🎙️ Iniciando gravação para Whisper...');
  
  // Pega apenas as tracks de áudio
  const audioTracks = state.localStream.getAudioTracks();
  if (audioTracks.length === 0) {
    alert('Nenhuma track de áudio disponível');
    return;
  }
  
  const audioStream = new MediaStream(audioTracks);
  
  try {
    state.mediaRecorder = new MediaRecorder(audioStream, {
      mimeType: 'audio/webm;codecs=opus'
    });
  } catch (e) {
    // Fallback para outros formatos
    try {
      state.mediaRecorder = new MediaRecorder(audioStream);
    } catch (e2) {
      console.error('MediaRecorder não suportado:', e2);
      alert('Gravação de áudio não suportada neste navegador');
      return;
    }
  }
  
  state.audioChunks = [];
  
  state.mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      state.audioChunks.push(event.data);
    }
  };
  
  state.mediaRecorder.onstop = async () => {
    if (state.audioChunks.length > 0) {
      await sendToWhisper();
    }
    
    // Continua gravando se ainda estiver ativo
    if (state.isRecording) {
      state.audioChunks = [];
      state.mediaRecorder.start();
      
      // Para após o intervalo configurado
      setTimeout(() => {
        if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
          state.mediaRecorder.stop();
        }
      }, CONFIG.recordingInterval);
    }
  };
  
  // Inicia a gravação
  state.isRecording = true;
  state.mediaRecorder.start();
  
  // Para e envia após o intervalo
  setTimeout(() => {
    if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
      state.mediaRecorder.stop();
    }
  }, CONFIG.recordingInterval);
  
  // Atualiza UI
  updateTranscriptionUI();
  updateStatus('listening', 'Transcrevendo com Whisper...');
  
  console.log('✅ Gravação iniciada');
}

/**
 * Para a gravação
 */
function stopRecording() {
  console.log('⏹️ Parando gravação...');
  
  state.isRecording = false;
  
  if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
    state.mediaRecorder.stop();
  }
  
  updateTranscriptionUI();
  updateStatus('idle', 'Pronto');
}

/**
 * Envia áudio para o backend Whisper
 */
async function sendToWhisper() {
  if (state.audioChunks.length === 0) return;
  
  const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
  
  // Verifica se o blob tem tamanho suficiente (evita enviar silêncio)
  if (audioBlob.size < 1000) {
    console.log('⏭️ Áudio muito curto, ignorando...');
    return;
  }
  
  console.log(`📤 Enviando ${(audioBlob.size / 1024).toFixed(1)}KB para Whisper...`);
  
  // Mostra indicador de processamento
  if (elements.captionInterim) {
    elements.captionInterim.textContent = '🔄 Processando...';
  }
  
  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');
  
  try {
    const response = await fetch(CONFIG.whisperEndpoint, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success && result.text) {
      processTranscript(result.text);
    } else if (result.error) {
      console.error('Erro do Whisper:', result.error);
    }
    
  } catch (error) {
    console.error('Erro ao enviar para Whisper:', error);
    if (elements.captionInterim) {
      elements.captionInterim.textContent = '❌ Erro de conexão com servidor';
    }
  }
}

/**
 * Processa o texto transcrito
 */
function processTranscript(text) {
  const cleanText = text.trim();
  if (!cleanText) return;
  
  console.log('📝 Transcrito:', cleanText);
  
  // Atualiza legenda principal
  if (elements.captionText) {
    elements.captionText.textContent = cleanText;
  }
  
  // Limpa texto provisório
  if (elements.captionInterim) {
    elements.captionInterim.textContent = '';
  }
  
  // Scroll para baixo
  if (elements.captionsContent) {
    elements.captionsContent.scrollTop = elements.captionsContent.scrollHeight;
  }
  
  // Envia para VLibras
  translateToLibras(cleanText);
}

function updateTranscriptionUI() {
  if (!elements.btnTranscription) return;
  
  elements.btnTranscription.classList.toggle('active', state.isRecording);
  
  const icon = elements.btnTranscription.querySelector('.control-icon');
  if (icon) {
    icon.textContent = state.isRecording ? '⏹️' : '💬';
  }
}

// ==================== TIMER E STATUS ====================

function startMeetingTimer() {
  state.meetingStartTime = Date.now();
  
  state.meetingTimer = setInterval(() => {
    const elapsed = Date.now() - state.meetingStartTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    if (elements.meetingTime) {
      elements.meetingTime.textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }, 1000);
}

function updateStatus(type, message) {
  if (!elements.statusDot || !elements.statusText) return;
  
  elements.statusDot.className = 'status-dot';
  
  switch (type) {
    case 'listening':
      elements.statusDot.classList.add('listening');
      break;
    case 'error':
      elements.statusDot.classList.add('error');
      break;
    default:
      elements.statusDot.classList.add('idle');
  }
  
  elements.statusText.textContent = message;
}

function leaveMeeting() {
  if (confirm('Deseja realmente sair da reunião?')) {
    if (state.localStream) {
      state.localStream.getTracks().forEach(track => track.stop());
    }
    
    clearInterval(state.meetingTimer);
    cancelAnimationFrame(state.audioAnimationId);
    
    if (state.isRecording) {
      stopRecording();
    }
    
    if (state.audioContext) {
      state.audioContext.close();
    }
    
    window.location.reload();
  }
}

console.log('📦 App.js carregado - usando Whisper para transcrição');
