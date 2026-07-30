import React from 'react';
import { LabelScannerView } from '@/presentation/components/LabelScannerView';

/**
 * Scan tab (Requirement 10). Photograph a food label → OCR → objective grade.
 * Barcode scanning will be added here later; for now this is the label scanner.
 */
export default function ScannerScreen() {
  return <LabelScannerView />;
}
