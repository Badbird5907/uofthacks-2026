import SignUpPage from "./client";
import { redirect } from "next/navigation";
import { getSession } from "@/server/better-auth/server";

export const metadata = {
  title: "Sign Up",
};

export default async function Page() {
  const token = await getSession();
  if (token) {
    redirect("/");
  }
  return <SignUpPage />;
}
