import { requireUser } from "@/lib/supabase/auth";
import NotesClient from "./notes-client";

export default async function NotesPage() {
  await requireUser();
  return <NotesClient />;
}
