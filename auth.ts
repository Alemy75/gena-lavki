import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const bcrypt = (await import("bcryptjs")).default;
        const { prisma } = await import("@/lib/prisma");
        const email = String(credentials.email).toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          return null;
        }
        const ok = await bcrypt.compare(
          String(credentials.password),
          user.passwordHash,
        );
        if (!ok) {
          return null;
        }
        return { id: user.id, email: user.email };
      },
    }),
  ],
});
