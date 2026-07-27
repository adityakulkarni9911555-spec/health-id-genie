import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPatients from "./tools/list-patients";
import getPatient from "./tools/get-patient";
import registerPatient from "./tools/register-patient";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "medora-mcp",
  title: "Medora",
  version: "0.1.0",
  instructions:
    "Tools for managing the Medora personal health wallet. Use list_patients to browse or search, get_patient for a single record, and register_patient to create a new record.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listPatients, getPatient, registerPatient],
});
