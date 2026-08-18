import { requireUser } from "@/lib/supabase/auth";
import TrackerDebugClient from "./debug-client";

export default async function TrackerDebugPage() {
  await requireUser();
  return <TrackerDebugClient />;
}
