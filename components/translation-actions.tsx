import CopyToClipboardButton, {
  type CopyToClipboardButtonProps,
} from '@/components/copy-to-clipboard-button';
import DownloadPdfButton from '@/components/download-pdf-button';
import { type LanguageCode } from '@/lib/ai/languages';

type TranslationActionsProps = CopyToClipboardButtonProps & {
  targetLanguage: LanguageCode;
};

// Bundles FA-12 (copy) and FA-11 (PDF export) so both call sites — the current translation and
// each history card — reuse one place instead of wiring both buttons individually.
//
// targetLanguage is the catalog type, not a display label: DownloadPdfButton needs the code both
// for the filename and to look up the display name itself. A DB row's target_language is a bare
// string, so the history page narrows it with isSupportedLanguageCode before it gets here.
const TranslationActions = ({ text, targetLanguage, className }: TranslationActionsProps) => {
  return (
    <div className="flex justify-end gap-2">
      <CopyToClipboardButton text={text} className={className} />
      <DownloadPdfButton text={text} targetLanguage={targetLanguage} />
    </div>
  );
};

export default TranslationActions;
