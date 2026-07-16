import { convertToModelMessages, streamText, type UIMessage } from 'ai';

import { getModel } from '@/lib/provider/provider';

export const POST = async (req: Request) => {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: getModel(),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
};
