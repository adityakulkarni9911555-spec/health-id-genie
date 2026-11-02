export type DocumentCategory = 'prescription' | 'lab' | 'scan' | 'discharge' | 'other';

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  prescription: 'Prescriptions',
  lab: 'Lab reports',
  scan: 'Scans',
  discharge: 'Discharge',
  other: 'Other',
};

/** Guesses a category from the file name and AI-read document type; display only, never saved. */
export function categorizeDocument(doc: { name: string; extractedData?: Record<string, unknown> }): DocumentCategory {
  const aiType = typeof doc.extractedData?.document_type === 'string' ? doc.extractedData.document_type : '';
  const text = `${doc.name} ${aiType}`.toLowerCase();
  if (/discharge/.test(text)) return 'discharge';
  if (/prescri|\brx\b|medicine|medication/.test(text)) return 'prescription';
  if (/x-?ray|mri|\bct\b|scan|ultrasound|sonograph|ecg|echo|imaging|radiolog/.test(text)) return 'scan';
  if (/lab|blood|test|report|cbc|lipid|thyroid|glucose|sugar|urine|pathology/.test(text)) return 'lab';
  return 'other';
}
