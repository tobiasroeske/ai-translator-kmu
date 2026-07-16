import { generateText } from 'ai';

import { getModel } from '@/lib/provider/provider';

export const GET = async () => {
  try {
    const result = await generateText({
      model: getModel(),
      prompt: 'Reply with the single word "Pong"',
    });
    return Response.json({ ok: true, provider: process.env.AI_PROVIDER, text: result.text });
  } catch (error) {
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
};
