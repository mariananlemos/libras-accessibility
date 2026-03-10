# 🤟 Libras Accessibility

Real-time speech-to-Libras (Brazilian Sign Language) translator using VLibras and Whisper.

![Electron](https://img.shields.io/badge/Electron-28.0.0-47848F?logo=electron)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)
![Python](https://img.shields.io/badge/Python-3.8+-3776AB?logo=python)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- 🎤 Real-time speech transcription (OpenAI Whisper)
- 🤟 Libras translation via VLibras (Brazilian government tool)
- 📹 Video meeting room with camera/microphone
- 📝 Live captions

## Quick Start

### 1. Install dependencies

```bash
# Node.js dependencies
npm install

# Python dependencies (for Whisper transcription)
pip install -r requirements.txt
```

### 2. Start the backend (Whisper)

```bash
python app.py
# Runs on http://localhost:5000
```

### 3a. Web Version (Codespaces / Browser)

```bash
npm run web
# Open http://localhost:3000
```

### 3b. Desktop Version (Electron)

```bash
npm start
```

## Tech Stack

- **Electron** - Desktop app
- **Express** - Local web server
- **Flask** - Python backend for Whisper
- **OpenAI Whisper** - Speech recognition
- **VLibras** - Official Libras translator (gov.br)

## How it works

1. Audio is captured from microphone via WebRTC
2. Audio chunks are sent to Flask backend every 3 seconds
3. Whisper transcribes audio to text
4. Text is displayed as captions
5. VLibras translates text to Libras (sign language)

## License

MIT
