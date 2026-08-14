'use client';

import { Check, ClipboardCopy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CopyToClipboardButtonProps = {
  text: string;
  className?: string;
};

const COPIED_RESET_DELAY_MS = 1500;

const CopyToClipboardButton = ({ text, className }: CopyToClipboardButtonProps) => {
  const [copied, setCopied] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clears a pending reset on unmount (or before a new one is scheduled) so a stale timer
  // never calls setState after the button is gone or overwrites a newer copy's timing.
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = setTimeout(() => setCopied(false), COPIED_RESET_DELAY_MS);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error('Fehler beim Kopieren des Textes in die Zwischenablage.');
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={cn('gap-2', copied && 'bg-success hover:bg-success/70', className)}
      onClick={handleCopy}
    >
      {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
      {copied ? 'Kopiert' : 'Kopieren'}
    </Button>
  );
};

export default CopyToClipboardButton;
