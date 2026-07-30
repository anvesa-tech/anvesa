import React from 'react';
import { useRouter } from 'expo-router';
import { LabelScannerView } from '@/presentation/components/LabelScannerView';

/**
 * Label analysis route (Requirement 10). Same scanner used by the Scan tab,
 * shown as a pushed screen with a back button.
 */
export default function AnalyzeLabelScreen() {
  const router = useRouter();
  return <LabelScannerView onBack={() => router.back()} />;
}
