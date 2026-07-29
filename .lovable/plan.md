## Goal

On step 3 of the registration form ("Insurance & documents"), give the user a second way to add documents — a **Scan document** action that opens the device's camera and captures directly to an image file — alongside the existing file picker.

## Placement

Keep the existing upload dropzone where it is. Add a horizontal row of **two side-by-side action buttons** inside the dropzone (below the "Prescriptions, reports, ID proofs…" helper text):

```text
┌───────── Upload dropzone (existing) ─────────┐
│   [ Upload icon ]                            │
│   Tap or drop files to upload                │
│   Prescriptions, reports, ID proofs…         │
│                                              │
│   [ 📎 Choose files ]  [ 📷 Scan document ]  │
└──────────────────────────────────────────────┘
```

On mobile the two buttons stack vertically; on tablet/desktop they sit side by side. This keeps a single, clear upload zone rather than scattering controls across the page.

## Behavior

- **Choose files** — existing behavior, no change.
- **Scan document** — opens the rear camera via a hidden `<input type="file" accept="image/*" capture="environment">`. The captured photo is fed through the same `handleFiles` pipeline (same size / type / count / plan-limit checks, same pending-files or immediate-upload path). No new upload logic.
- If the browser has no camera / doesn't honor `capture`, the OS falls back to its normal file picker — safe degradation, no error.
- The camera input is disabled under the same conditions as the file input (disabled prop, uploading, plan limit reached).

## Files to change

- `src/components/DocumentUpload.tsx`
  - Add a second hidden `<input ref={cameraInputRef} type="file" accept="image/*" capture="environment">`.
  - Add a "Scan document" button (Camera icon from lucide-react) next to the existing "Choose files" button; wrap both in a flex row (`flex-col sm:flex-row`).
  - Reuse `handleFiles` for the camera input's `onChange`.

No changes needed to `PatientRegistrationForm.tsx`, storage logic, or the database — the new button reuses the existing `DocumentUpload` component already rendered on step 3.
