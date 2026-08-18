import { Suspense } from "react";
import { requireUser } from "@/lib/supabase/auth";
import DashboardClient from "./dashboard-client";

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <AuthedDashboardPage />
    </Suspense>
  );
}

async function AuthedDashboardPage() {
  await requireUser();
  return <DashboardClient />;
}
