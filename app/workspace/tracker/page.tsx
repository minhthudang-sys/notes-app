import { Suspense } from "react";
import { requireUser } from "@/lib/supabase/auth";
import TrackerClient from "./tracker-client";

export default function TrackerPage() {
  return (
    <Suspense fallback={null}>
      <AuthedTrackerPage />
    </Suspense>
  );
}

async function AuthedTrackerPage() {
  await requireUser();
  return <TrackerClient />;
}
