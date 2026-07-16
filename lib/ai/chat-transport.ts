// Sentinel im Error-Message, um den 401 (Session abgelaufen) vom generischen

import { DefaultChatTransport } from 'ai';

// Fehler (z.B. Ollama nicht erreichbar) zu unterscheiden.
export const AUTH_ERROR = 'AUTH_EXPIRED';

// Eigener fetch fängt den 401 der Middleware ab und macht ihn als Error sichtbar
// — useChat reicht den HTTP-Status sonst nicht durch. Modulebene, damit der
// Transport nicht bei jedem Render neu erzeugt wird.
export const chatTransport = new DefaultChatTransport({
  api: '/api/chat',
  fetch: async (input, init) => {
    const response = await fetch(input, init);
    if (response.status === 401) {
      throw new Error(AUTH_ERROR);
    }
    return response;
  },
});
