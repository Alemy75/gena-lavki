"use client";

import { SessionProvider } from "next-auth/react";
import { ContactModalProvider } from "@/components/contact-modal";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ContactModalProvider>{children}</ContactModalProvider>
    </SessionProvider>
  );
}
