## Goal
Remove the test patient record that was created while trying the app, so the data store only contains real consumer data.

## Current state
The `public.patients` table contains one recent test record:
- ID: `fb4601f7-ec8c-42a3-9ea9-e8f20c5cc4c2`
- Name: Aryan Singh
- Phone: +91 8169389938
- Owner profile: `526be891-242c-40fe-af3b-a7d4d5772619`

No documents are stored in the `patient-documents` storage bucket for this record.

## Plan
1. Delete the test patient row from `public.patients` using a data change query.
2. Leave the user profile/account untouched, as requested, use asked to remove only the patient record.
3. Confirm the deletion by re-querying the table.

## Technical details
- This is a data cleanup, not a schema change, so it will be executed with the data modification tool.
- The delete will target the specific patient ID to avoid affecting any other data.
- No code changes are required.