export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="max-w-sm w-full mw-auto place-self-center">{children}</div>;
}