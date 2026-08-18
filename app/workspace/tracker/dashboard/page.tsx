import { requireUser } from "@/lib/supabase/auth";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  await requireUser();
  return <DashboardClient />;
}
