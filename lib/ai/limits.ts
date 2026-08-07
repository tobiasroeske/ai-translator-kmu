// Upper bound on what a single translation request may contain, enforced in the UI (counter +
// disabled submit) and re-checked in the route.
//
// The number is derived from the local dev model's context window: qwen2.5:7b runs with a 4096
// token context, and a request has to fit its prompt AND its generated translation into that. At
// this length the prompt is roughly 800 tokens and the maxOutputTokens backstop in
// app/api/translate/route.ts allows ~1800 more — comfortably inside the window. Going higher makes
// Ollama shift the context window mid-generation, which is drastically slower than staying within
// it. It also keeps the token cap purely a runaway guard: a text that passes this check can never
// be long enough to get cut off mid-translation.
//
// Roughly a page of business correspondence, well beyond the emails and notes this demonstrator
// targets. Revisit together with the model choice, not on its own.
export const MAX_SOURCE_TEXT_LENGTH = 3000;
