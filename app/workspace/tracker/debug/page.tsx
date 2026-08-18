import { Suspense } from "react";
import { requireUser } from "@/lib/supabase/auth";
import TrackerDebugClient from "./debug-client";

export default function TrackerDebugPage() {
  return (
    <Suspense fallback={null}>
      <AuthedTrackerDebugPage />
    </Suspense>
  );
}

async function AuthedTrackerDebugPage() {
  await requireUser();
  return <TrackerDebugClient />;
}
