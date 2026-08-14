'use client';

import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { type LanguageCode, toLanguageName } from '@/lib/ai/languages';
import { NOTICE_TEXT } from '@/lib/notice';
import { createPdfFilename } from '@/lib/pdf/filename';
import { cn } from '@/lib/utils';

type DownloadPdfButtonProps = {
  text: string;
  targetLanguage: LanguageCode;
  className?: string;
};

// jsPDF's unit is mm by default (A4 portrait: 210 x 297). Both are read from the document itself
// rather than hardcoded, so the layout stays correct if the page format ever changes.
const MARGIN_MM = 20;
const LINE_HEIGHT_MM = 6;

const DownloadPdfButton = ({ text, targetLanguage, className }: DownloadPdfButtonProps) => {
  const handleDownload = useCallback(async () => {
    // Loaded on demand: jsPDF is a sizeable library needed only once a user actually exports, so
    // a static import would make every dashboard visit pay for a feature most sessions don't use.
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - MARGIN_MM * 2;
    let y = MARGIN_MM;

    // splitTextToSize only wraps by width — it knows nothing about paragraph breaks in the
    // source string, so blank lines between paragraphs have to be reconstructed by writing each
    // paragraph as its own block. y is tracked by hand because jsPDF has no auto-flow: it writes
    // exactly where it's told and never advances the cursor on its own.
    const writeParagraph = (paragraph: string) => {
      const lines: string[] = doc.splitTextToSize(paragraph, contentWidth);
      for (const line of lines) {
        if (y + LINE_HEIGHT_MM > pageHeight - MARGIN_MM) {
          doc.addPage();
          y = MARGIN_MM;
        }
        doc.text(line, MARGIN_MM, y);
        y += LINE_HEIGHT_MM;
      }
      y += LINE_HEIGHT_MM;
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    writeParagraph(`Übersetzung (${toLanguageName(targetLanguage)})`);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    text.split(/\n\s*\n/).forEach(writeParagraph);

    // FA-05/FA-10: the AI-generated label and non-binding disclaimer must travel with the
    // exported file itself — the on-screen notice alone doesn't satisfy the obligation once the
    // text leaves the app as a PDF.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    writeParagraph(NOTICE_TEXT);

    doc.save(createPdfFilename(targetLanguage));
  }, [text, targetLanguage]);

  return (
    <Button
      type="button"
      variant="outline"
      className={cn('gap-2', className)}
      onClick={handleDownload}
    >
      PDF exportieren
    </Button>
  );
};

export default DownloadPdfButton;
