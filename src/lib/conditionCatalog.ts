/** Long-term (chronic) conditions grouped for the registration picker.
 *  Existing saved names (Diabetes, Hypertension, Asthma, Heart Disease, Thyroid,
 *  Arthritis, COPD, Kidney Disease) are kept verbatim for backward compatibility. */
export const CONDITION_GROUPS: { group: string; items: string[] }[] = [
  { group: 'Heart & blood vessels', items: ['Hypertension', 'Heart Disease', 'Coronary Artery Disease', 'Heart Failure', 'Arrhythmia / Atrial Fibrillation', 'Previous Heart Attack', 'Previous Stroke', 'Pacemaker / Heart Device', 'High Cholesterol'] },
  { group: 'Hormones & metabolism', items: ['Diabetes', 'Type 1 Diabetes', 'Type 2 Diabetes', 'Thyroid', 'Hypothyroidism', 'Hyperthyroidism', 'PCOS', 'Obesity', 'Gout'] },
  { group: 'Lungs & breathing', items: ['Asthma', 'COPD', 'Tuberculosis (on treatment)', 'Interstitial Lung Disease', 'Sleep Apnea'] },
  { group: 'Kidney & liver', items: ['Kidney Disease', 'On Dialysis', 'Kidney Transplant', 'Fatty Liver', 'Cirrhosis', 'Chronic Hepatitis B', 'Chronic Hepatitis C'] },
  { group: 'Brain & nerves', items: ['Epilepsy / Seizures', 'Migraine', "Parkinson's Disease", "Alzheimer's / Dementia", 'Multiple Sclerosis', 'Neuropathy'] },
  { group: 'Mental health', items: ['Depression', 'Anxiety Disorder', 'Bipolar Disorder', 'Schizophrenia', 'ADHD', 'Autism'] },
  { group: 'Blood & immunity', items: ['Anemia', 'Thalassemia', 'Sickle Cell Disease', 'Hemophilia / Bleeding Disorder', 'On Blood Thinners', 'HIV', 'Lupus (SLE)'] },
  { group: 'Bones, joints & gut', items: ['Arthritis', 'Rheumatoid Arthritis', 'Osteoporosis', "Crohn's Disease", 'Ulcerative Colitis', 'Celiac Disease'] },
  { group: 'Cancer & transplant', items: ['Cancer (current)', 'Cancer (past)', 'Organ Transplant'] },
  { group: 'Eyes & ears', items: ['Glaucoma', 'Hearing Loss', 'Visual Impairment'] },
];

export const ALL_LISTED_CONDITIONS = CONDITION_GROUPS.flatMap((g) => g.items);
