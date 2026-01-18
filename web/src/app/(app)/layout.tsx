import { getSession } from "@/server/better-auth/server";
import { getOnboardingStatus } from "@/lib/onboarding";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/auth/sign-in");
  }

  // Check if user has completed onboarding
  const onboardingStatus = await getOnboardingStatus(session.user);
  if (!onboardingStatus.isComplete) {
    redirect("/onboarding");
  }

  return children;
}