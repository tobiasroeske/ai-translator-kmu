// Everything that bounds a single request to the model. All of it is derived from the local dev
// model's context window: qwen2.5:7b runs with a 4096 token context, and a request has to fit its
// prompt AND its generated translation into that. Revisit together with the model choice, not
// individually.

// Upper bound on what a single translation request may contain, enforced in the UI (counter +
// disabled submit) and re-checked in the route.
//
// At this length the prompt is roughly 800 tokens and the output budget below allows ~1800 more —
// comfortably inside the window. Going higher makes Ollama shift the context window mid-generation,
// which is drastically slower than staying within it. It also keeps the token budget purely a
// runaway guard: a text that passes this check can never be long enough to get cut off
// mid-translation.
//
// Roughly a page of business correspondence, well beyond the emails and notes this demonstrator
// targets.
export const MAX_SOURCE_TEXT_LENGTH = 3000;

// A segment is one paragraph of a source text, so it can never legitimately exceed one. The same
// ceiling applies rather than a smaller one: the split is the user's paragraph structure, and a
// single-paragraph text is a perfectly normal input.
export const MAX_SEGMENT_TEXT_LENGTH = MAX_SOURCE_TEXT_LENGTH;

// A comment is a hint about how to translate ("use term X, not Y"), not a document. Bounding it
// keeps the instruction from crowding the text it is supposed to be about out of the context
// window — and keeps a direct caller from using this field as an unbounded prompt channel.
export const MAX_COMMENT_LENGTH = 500;

// Hard backstop against a runaway generation. A translation stays in the ballpark of its source
// length, so ~4 chars per token doubled leaves room for languages that expand plus the surrounding
// JSON. Without this a small model that starts repeating itself streams until the context window
// runs out; the prompts discourage that, this makes it impossible.
const OUTPUT_OVERHEAD_TOKENS = 300;

export const outputTokenBudget = (inputLength: number) =>
  Math.ceil(inputLength / 2) + OUTPUT_OVERHEAD_TOKENS;
