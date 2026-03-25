# Libras Accessibility

Accessible meeting interface with live speech captions and VLibras integration.

## What this project does

- Captures microphone audio in the browser
- Generates live captions in Portuguese
- Integrates the official VLibras plugin for Libras interaction
- Supports both local development and Vercel deployment

## Runtime modes

### Local mode (Flask + Whisper)

Use this mode when running everything on your machine.

1. Install dependencies:

```bash
npm install
pip install -r requirements.txt
```

2. Start Python backend:

```bash
python app.py
```

3. Start web server:

```bash
npm run web
```

4. Open:

```text
http://localhost:3000
```

In local mode, transcription requests go to `/transcribe`.

### Production mode (Vercel)

In Vercel, the app uses a serverless transcription endpoint at `api/transcribe.js`.

1. Import this repository into Vercel
2. Add environment variable:

```bash
OPENAI_API_KEY=your_key_here
```

3. Deploy

In production, the frontend automatically uses `/api/transcribe`.

## Main files

- `web/index.html`: Meeting UI
- `web/styles.css`: Layout and responsive styles
- `web/app.js`: Client logic (media, captions, controls)
- `api/transcribe.js`: Serverless transcription endpoint (Vercel)
- `app.py`: Local Flask backend with Whisper
- `vercel.json`: Vercel routing/build config
- `.vercelignore`: Excludes local-only files from Vercel upload

## Notes

- Do not commit secrets. Keep keys in `.env.local` and Vercel environment variables.
- `.env.local` is ignored by Git.
- Use `.env.example` as reference.

## Tech stack

- Frontend: HTML, CSS, JavaScript
- Local backend: Flask + openai-whisper + torch
- Web server: Express
- Desktop shell: Electron
- Cloud deploy: Vercel (Node serverless function)
- Accessibility integration: VLibras

## License

MIT
