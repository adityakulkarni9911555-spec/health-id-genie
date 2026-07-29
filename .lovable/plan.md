## Goal

On the "Your Medora wallet is ready" page (shown after registration), let the user add or scan documents in place — without going back to Update details.

## Placement

Add a compact **"Add documents"** section immediately below the Health Card preview and above the existing action row (Update details / Download / Print). It uses the same `DocumentUpload` component already used in the registration form, wired to upload straight into the user's existing patient record.

```text
[ Health Card ]
[ Add documents  ← new section (upload zone + Choose files / Scan document) ]
[ Update details ] [ Download Card ] [ Print Card ]
```

This keeps the existing "Attached Documents" list further down as the read/analyze view, while the new section is a dedicated write surface at the top of the actions area.

## Behavior

- Uses the existing `DocumentUpload` component in **immediate upload mode**, so each file/scan is uploaded to Storage and appended to `patient.documents` right away.
- Reuses `uploadPatientDocument` + `persistPatientDocuments` from `src/lib/patientDocuments.ts` — same size / type / count / plan-limit checks, same storage path.
- After a successful upload, `HealthCardPreview` updates local `patient` state so the new file appears instantly in the "Attached Documents" list below and the plan's remaining-slots banner updates.
- Camera capture reuses the "Scan document" button already added to `DocumentUpload` (rear camera via `capture="environment"`, safe fallback to file picker).
- Hidden in print view (`no-print`).

## Files to change

- `src/components/HealthCardPreview.tsx`
  - Import `DocumentUpload` and the upload/persist helpers.
  - Add an `onDocumentsChange` handler that calls `persistPatientDocuments(patient.id, next)` and updates local `patient` state.
  - Render `<DocumentUpload>` in a new `form-section no-print` block between the card preview and the actions grid, passing `documents={patient.documents}`, `uploadImmediately={{ upload: (f) => uploadPatientDocument(patient.id, f) }}`, and the plan's `documentLimit` as `maxFiles`.

No changes to the database, storage, or the registration form — this is purely a new entry point to the existing upload pipeline.