import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Админ",
  // Админка (включая публичную /admin/login) не должна попадать в выдачу;
  // дублируется заголовком X-Robots-Tag в next.config.ts.
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
