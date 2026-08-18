import { requireUser } from "@/lib/supabase/auth";
import TrackerClient from "./tracker-client";

export default async function TrackerPage() {
  await requireUser();
  return <TrackerClient />;
}
