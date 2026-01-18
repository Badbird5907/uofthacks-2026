import SignOutPage from "./client";
import { redirect } from "next/navigation";
import { getSession } from "@/server/better-auth/server";

export const metadata = {
  title: "Sign Out",
};

export default async function Page() {
  const token = await getSession();
  if (!token) {
    redirect("/sign-in");
  }
  return <SignOutPage />;
}
