export const config = {
  runtime: 'edge'
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Metodo nao permitido' }), {
      status: 405,
      headers: { 'content-type': 'application/json' }
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ success: false, error: 'OPENAI_API_KEY nao configurada' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }

  try {
    const incoming = await request.formData();
    const audioFile = incoming.get('audio');

    if (!audioFile) {
      return new Response(JSON.stringify({ success: false, error: 'Nenhum arquivo de audio enviado' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    const openAiFormData = new FormData();
    openAiFormData.append('file', audioFile, audioFile.name || 'audio.webm');
    openAiFormData.append('model', 'gpt-4o-mini-transcribe');
    openAiFormData.append('language', 'pt');

    const openAiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: openAiFormData
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: `Falha na API de transcricao (${openAiResponse.status}): ${errorText}`
        }),
        {
          status: 502,
          headers: { 'content-type': 'application/json' }
        }
      );
    }

    const data = await openAiResponse.json();
    const text = (data.text || '').trim();

    return new Response(JSON.stringify({ success: true, text }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' }
      }
    );
  }
}
