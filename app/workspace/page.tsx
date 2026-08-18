import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/auth";

export default async function WorkspacePage() {
  await requireUser();
  redirect("/workspace/notes");
}
