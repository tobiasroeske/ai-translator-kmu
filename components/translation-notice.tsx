import { NOTICE_TEXT } from '@/lib/notice';

// FA-05 (EU AI Act Art. 50) and FA-10 in one line, shown directly on every translation output.
//
// They are two requirements but one message to the reader: what produced this text, and what it is
// worth legally. Split across two elements they competed for attention and repeated themselves;
// the obligation is that the notice is visible and attached to the output, not that it is loud.
const TranslationNotice = () => {
  return <p className="text-xs text-muted-foreground">{NOTICE_TEXT}</p>;
};

export default TranslationNotice;
