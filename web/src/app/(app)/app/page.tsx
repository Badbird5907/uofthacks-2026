import { redirect } from "next/navigation";
import { getSession } from "@/server/better-auth/server";

export default async function AppPage() {
  const session = await getSession();
  
  if (!session) {
    redirect("/auth/sign-in");
  }

  // Redirect based on user role
  if (session.user.isRecruiter) {
    redirect("/r");
  } else {
    redirect("/c");
  }
}