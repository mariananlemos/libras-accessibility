# 🤟 Libras Accessibility

Real-time speech-to-Libras (Brazilian Sign Language) translator using VLibras.

![Electron](https://img.shields.io/badge/Electron-28.0.0-47848F?logo=electron)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- 🎤 Real-time speech transcription (Web Speech API)
- 🤟 Libras translation via VLibras (Brazilian government tool)
- 📹 Video meeting room with camera/microphone
- 📝 Live captions

## Quick Start

### Web Version (Codespaces / Browser)

```bash
npm install
npm run web
# Open http://localhost:3000
```

### Desktop Version (Electron)

```bash
npm install
npm start
```

## Tech Stack

- **Electron** - Desktop app
- **Express** - Local web server
- **VLibras** - Official Libras translator (gov.br)
- **Web Speech API** - Speech recognition

## License

MIT
