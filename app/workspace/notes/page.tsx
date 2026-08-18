import { Suspense } from "react";
import { requireUser } from "@/lib/supabase/auth";
import NotesClient from "./notes-client";

export default function NotesPage() {
  return (
    <Suspense fallback={null}>
      <AuthedNotesPage />
    </Suspense>
  );
}

async function AuthedNotesPage() {
  await requireUser();
  return <NotesClient />;
}
