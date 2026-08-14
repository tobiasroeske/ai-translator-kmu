'use client';
import { type AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import { type ComponentProps, type FC } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supportedLanguageLabels, toLanguageName } from '@/lib/ai/languages';

type UnsupportedLanguageDialogProps = ComponentProps<typeof AlertDialogPrimitive.Root> & {
  detectedLanguage?: string;
};

const UnsupportedLanguageDialog: FC<UnsupportedLanguageDialogProps> = ({
  open,
  onOpenChange,
  detectedLanguage,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sprache wird nicht unterstützt</AlertDialogTitle>
          <AlertDialogDescription>
            {detectedLanguage
              ? `Der Text wurde als ${toLanguageName(detectedLanguage)} erkannt. Diese Sprache wird derzeit nicht unterstützt.`
              : 'Die Sprache des Textes wird derzeit nicht unterstützt.'}{' '}
            Unterstützt werden: {supportedLanguageLabels.join(', ')}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Verstanden</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnsupportedLanguageDialog;
