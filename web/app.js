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
  whisperEndpoint: window.location.hostname === 'localhost' ? '/transcribe' : '/api/transcribe',
  recordingInterval: 5000, // Grava em chunks de 5 segundos
  whisperTimeout: 30000,   // Timeout de 30s para o Whisper
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
  captionLines: document.getElementById('caption-lines'),
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
  vlibrasWidget: null,
  librasEnabled: false,
  lastTranslatedText: '',
  vlibrasQueue: [],
  
  // Web Speech API
  speechRecognition: null,
  useSpeechAPI: false,
  
  // Whisper
  isSendingToWhisper: false,
  
  // Reunião
  meetingStartTime: null,
  meetingTimer: null,
  captionHistory: [],
  
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
  
  // Inicializa Web Speech API (legendas em tempo real)
  initSpeechRecognition();
  
  // Inicia verificação do VLibras
  initVLibras();
}

// ==================== WEB SPEECH API ====================

/**
 * Inicializa o reconhecimento de voz via Web Speech API (tempo real)
 * Fallback: Whisper via backend Flask
 */
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.warn('⚠️ Web Speech API não suportada. Usando apenas Whisper.');
    state.useSpeechAPI = false;
    return;
  }
  
  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  
  recognition.onresult = (event) => {
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
    
    // Mostra texto provisório (enquanto fala)
    if (interimTranscript && elements.captionInterim) {
      elements.captionInterim.textContent = interimTranscript;
    }
    
    // Texto final confirmado
    if (finalTranscript) {
      processTranscript(finalTranscript);
    }
  };
  
  recognition.onerror = (event) => {
    console.error('❌ Erro no reconhecimento de voz:', event.error);
    if (event.error === 'not-allowed') {
      updateStatus('error', 'Microfone não permitido');
    } else if (event.error === 'no-speech') {
      // Silêncio — não é erro crítico
    } else if (event.error === 'network') {
      console.warn('⚠️ Speech API indisponível, alternando para Whisper');
      state.useSpeechAPI = false;
      if (state.isRecording) {
        startWhisperRecording();
      }
    }
  };
  
  recognition.onend = () => {
    // Reinicia automaticamente se ainda estiver gravando
    if (state.isRecording && state.useSpeechAPI) {
      try {
        recognition.start();
      } catch (e) {
        console.warn('Erro ao reiniciar Speech API:', e);
      }
    }
  };
  
  state.speechRecognition = recognition;
  state.useSpeechAPI = true;
  console.log('✅ Web Speech API inicializada (pt-BR)');
}

// ==================== VLIBRAS ====================

/**
 * Inicializa o VLibras com polling robusto
 * Verifica DOM + iframe + widget API antes de marcar como pronto
 */
function initVLibras() {
  console.log('🔄 Inicializando VLibras...');
  
  let attempts = 0;
  const maxAttempts = 60; // 30 seconds
  
  const checkVLibras = setInterval(() => {
    attempts++;
    
    // Fase 1: Verifica se os elementos DOM do VLibras existem
    const vwAccess = document.querySelector('[vw-access-button]');
    const vwPlugin = document.querySelector('[vw-plugin-wrapper]');
    
    if (vwPlugin && vwAccess) {
      // Fase 2: Verifica se o iframe do player foi criado e carregou
      const vwIframe = vwPlugin.querySelector('iframe');
      const widgetReady = vwIframe && vwIframe.contentWindow;
      
      if (widgetReady) {
        clearInterval(checkVLibras);
        state.vlibrasReady = true;
        
        if (elements.vlibrasPlaceholder) {
          elements.vlibrasPlaceholder.classList.add('hidden');
        }
        if (elements.vlibrasBadge) {
          elements.vlibrasBadge.textContent = 'Pronto ✅';
          elements.vlibrasBadge.classList.add('ready');
        }
        
        console.log('✅ VLibras carregado e pronto!');
        
        // Abre o widget automaticamente
        setTimeout(() => {
          try {
            vwAccess.click();
            console.log('🎬 VLibras player aberto');
          } catch (e) {
            console.warn('Não foi possível abrir VLibras automaticamente:', e);
          }
          
          // Processa textos que ficaram na fila enquanto o VLibras carregava
          flushVLibrasQueue();
        }, 1000);
      }
    }
    
    if (attempts >= maxAttempts && !state.vlibrasReady) {
      clearInterval(checkVLibras);
      if (elements.vlibrasLoadingText) {
        elements.vlibrasLoadingText.textContent = 'VLibras não disponível';
      }
      if (elements.vlibrasBadge) {
        elements.vlibrasBadge.textContent = 'Offline';
      }
      console.error('❌ Timeout ao carregar VLibras');
    }
  }, 500);
}

/**
 * Processa a fila de textos pendentes após o VLibras ficar pronto
 */
function flushVLibrasQueue() {
  if (state.vlibrasQueue.length === 0) return;
  
  // Envia apenas o último texto da fila (mais relevante)
  const lastText = state.vlibrasQueue[state.vlibrasQueue.length - 1];
  state.vlibrasQueue = [];
  
  console.log('📤 Enviando texto da fila para VLibras:', lastText);
  sendToVLibras(lastText);
}

/**
 * Envia texto para tradução no VLibras
 * Se o widget ainda não estiver pronto, enfileira o texto
 */
function translateToLibras(text) {
  if (!state.librasEnabled || !text) return;
  if (text === state.lastTranslatedText) return;
  
  state.lastTranslatedText = text;
  
  if (!state.vlibrasReady) {
    state.vlibrasQueue.push(text);
    console.log('🤟 VLibras não pronto, texto na fila:', text);
    return;
  }
  
  sendToVLibras(text);
}

/**
 * Envia texto efetivamente para o widget VLibras
 * Tenta múltiplas abordagens: textarea + botão, Enter, postMessage
 */
function sendToVLibras(text) {
  console.log('🤟 Traduzindo para Libras:', text);
  
  try {
    // Busca campo de texto do VLibras (seletores globais)
    const selectors = [
      '[vw-plugin-wrapper] textarea',
      '[vw-plugin-wrapper] input[type="text"]',
      '.vw-plugin-wrapper textarea',
      '.vw-plugin-wrapper input[type="text"]',
      '.vw-text-input',
      '.vp-input'
    ];
    
    let inputField = null;
    for (const sel of selectors) {
      inputField = document.querySelector(sel);
      if (inputField) break;
    }
    
    if (inputField) {
      inputField.value = text;
      inputField.dispatchEvent(new Event('input', { bubbles: true }));
      inputField.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Procura e clica no botão de traduzir
      setTimeout(() => {
        const btnSelectors = [
          '[vw-plugin-wrapper] .vw-btn-send',
          '.vw-plugin-wrapper .vw-btn-send',
          '[vw-plugin-wrapper] button',
          '.vw-btn-send',
          '.vw-send',
          '.vp-play',
          '[title="Traduzir"]',
          'button[type="submit"]'
        ];
        
        let translateBtn = null;
        for (const sel of btnSelectors) {
          translateBtn = document.querySelector(sel);
          if (translateBtn) break;
        }
        
        if (translateBtn) {
          translateBtn.click();
          console.log('✅ Texto enviado para VLibras');
        } else {
          // Fallback: tenta Enter
          inputField.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true
          }));
          inputField.dispatchEvent(new KeyboardEvent('keypress', {
            key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true
          }));
          inputField.dispatchEvent(new KeyboardEvent('keyup', {
            key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true
          }));
          console.log('⌨️ Texto enviado via Enter');
        }
      }, 300);
    } else {
      // Fallback: tenta postMessage para o iframe do VLibras
      const vwIframe = document.querySelector('[vw-plugin-wrapper] iframe');
      if (vwIframe && vwIframe.contentWindow) {
        vwIframe.contentWindow.postMessage({
          type: 'translate',
          text: text
        }, '*');
        console.log('📨 Texto enviado via postMessage para iframe VLibras');
      } else {
        console.warn('⚠️ Campo de entrada e iframe do VLibras não encontrados');
      }
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
  setTimeout(() => {
    if (!state.isRecording) {
      startRecording();
    }
  }, 600);
  
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
  elements.btnMic.title = state.micEnabled ? 'Desligar microfone' : 'Ligar microfone';
  
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
  elements.btnCamera.title = state.cameraEnabled ? 'Desligar câmera' : 'Ligar câmera';
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

function clearCaptions() {
  state.captionHistory = [];
  if (elements.captionLines) {
    elements.captionLines.innerHTML = '';
    const placeholder = document.createElement('p');
    placeholder.id = 'caption-text';
    placeholder.className = 'caption-text caption-placeholder';
    placeholder.textContent = 'As legendas aparecerão aqui quando você começar a falar...';
    elements.captionLines.appendChild(placeholder);
    elements.captionText = placeholder;
  }
  if (elements.captionInterim) {
    elements.captionInterim.textContent = '';
  }
}

// ==================== GRAVAÇÃO + TRANSCRIÇÃO ====================

/**
 * Inicia transcrição: Web Speech API (tempo real) ou Whisper (backend)
 */
function startRecording() {
  if (!state.localStream) {
    alert('Microfone não disponível');
    return;
  }
  
  state.isRecording = true;
  updateTranscriptionUI();
  
  // Tenta Web Speech API primeiro (legendas em tempo real, sem backend)
  if (state.useSpeechAPI && state.speechRecognition) {
    try {
      state.speechRecognition.start();
      updateStatus('listening', 'Ouvindo (Speech API)...');
      console.log('🎙️ Transcrição iniciada via Web Speech API (pt-BR)');
      return;
    } catch (e) {
      console.warn('⚠️ Falha ao iniciar Speech API, tentando Whisper:', e);
      state.useSpeechAPI = false;
    }
  }
  
  // Fallback: Whisper via backend Flask
  startWhisperRecording();
}

/**
 * Inicia gravação para envio ao Whisper (fallback)
 */
function startWhisperRecording() {
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
  
  state.mediaRecorder.onstop = () => {
    // Captura chunks atuais e reseta para próxima gravação
    const chunksToSend = [...state.audioChunks];
    state.audioChunks = [];
    
    // Envia para Whisper (sem bloquear a próxima gravação)
    if (chunksToSend.length > 0) {
      sendToWhisper(chunksToSend);
    }
    
    // Reinicia gravação imediatamente se ainda ativo
    if (state.isRecording && state.mediaRecorder) {
      try {
        state.mediaRecorder.start();
        setTimeout(() => {
          if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
            state.mediaRecorder.stop();
          }
        }, CONFIG.recordingInterval);
      } catch (e) {
        console.error('Erro ao reiniciar gravação:', e);
        state.isRecording = false;
        updateTranscriptionUI();
        updateStatus('error', 'Erro na gravação');
      }
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
 * Para a gravação (Speech API ou Whisper)
 */
function stopRecording() {
  console.log('⏹️ Parando transcrição...');
  
  state.isRecording = false;
  
  // Para Web Speech API
  if (state.speechRecognition) {
    try {
      state.speechRecognition.stop();
    } catch (e) {
      // Pode já estar parado
    }
  }
  
  // Para Whisper MediaRecorder
  if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
    state.mediaRecorder.stop();
  }
  
  updateTranscriptionUI();
  updateStatus('idle', 'Pronto');
}

/**
 * Envia áudio para o backend Whisper
 */
async function sendToWhisper(chunks) {
  if (!chunks || chunks.length === 0) return;
  
  // Evita requisições concorrentes
  if (state.isSendingToWhisper) {
    console.log('⏭️ Já há uma transcrição em andamento, ignorando chunk...');
    return;
  }
  
  const audioBlob = new Blob(chunks, { type: 'audio/webm' });
  
  if (audioBlob.size < 1000) {
    console.log('⏭️ Áudio muito curto, ignorando...');
    return;
  }
  
  console.log(`📤 Enviando ${(audioBlob.size / 1024).toFixed(1)}KB para Whisper...`);
  
  if (elements.captionInterim) {
    elements.captionInterim.textContent = '🔄 Processando...';
  }
  
  state.isSendingToWhisper = true;
  
  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.whisperTimeout);
  
  try {
    const response = await fetch(CONFIG.whisperEndpoint, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Servidor retornou status ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.text && result.text.trim()) {
      processTranscript(result.text);
    } else if (result.error) {
      console.error('Erro do Whisper:', result.error);
      if (elements.captionInterim) {
        elements.captionInterim.textContent = '';
      }
    } else {
      // Whisper retornou vazio (silêncio)
      if (elements.captionInterim) {
        elements.captionInterim.textContent = '';
      }
    }
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error('⏱️ Timeout na transcrição');
      if (elements.captionInterim) {
        elements.captionInterim.textContent = '⏱️ Timeout - tentando novamente...';
      }
    } else {
      console.error('Erro ao enviar para Whisper:', error);
      if (elements.captionInterim) {
        elements.captionInterim.textContent = '❌ Erro de conexão com servidor';
      }
    }
  } finally {
    state.isSendingToWhisper = false;
    
    // Limpa mensagem de processamento após 3s se ainda estiver visível
    setTimeout(() => {
      if (elements.captionInterim && 
          (elements.captionInterim.textContent === '🔄 Processando...' ||
           elements.captionInterim.textContent.startsWith('⏱️') ||
           elements.captionInterim.textContent.startsWith('❌'))) {
        elements.captionInterim.textContent = '';
      }
    }, 3000);
  }
}

/**
 * Processa o texto transcrito
 */
function processTranscript(text) {
  const cleanText = text.trim();
  if (!cleanText) return;
  
  console.log('📝 Transcrito:', cleanText);
  
  state.captionHistory.push(cleanText);
  if (state.captionHistory.length > 3) {
    state.captionHistory.shift();
  }

  renderCaptionLines();
  
  // Limpa texto provisório
  if (elements.captionInterim) {
    elements.captionInterim.textContent = '';
  }
  
  // Scroll para baixo
  if (elements.captionsContent) {
    elements.captionsContent.scrollTop = elements.captionsContent.scrollHeight;
  }
  
  // Fluxo manual: o envio para VLibras e feito pelo botao "Interagir" do plugin
}

function renderCaptionLines() {
  if (!elements.captionLines) return;

  elements.captionLines.innerHTML = '';

  if (state.captionHistory.length === 0) {
    const placeholder = document.createElement('p');
    placeholder.id = 'caption-text';
    placeholder.className = 'caption-text caption-placeholder';
    placeholder.textContent = 'As legendas aparecerão aqui quando você começar a falar...';
    elements.captionLines.appendChild(placeholder);
    elements.captionText = placeholder;
    return;
  }

  state.captionHistory.forEach((line) => {
    const captionLine = document.createElement('p');
    captionLine.className = 'caption-text caption-line';
    captionLine.textContent = line;
    elements.captionLines.appendChild(captionLine);
  });
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
