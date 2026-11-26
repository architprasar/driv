import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DrivioCars | Sign In",
  description: "Sign in to access your DrivioCars garage",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}
