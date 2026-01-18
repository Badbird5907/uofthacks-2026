import type { ReactNode } from "react";

export const metadata = {
  title: "Auth"
};

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl">{children}</div>
    </div>
  );
}