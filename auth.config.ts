import type { NextAuthConfig } from "next-auth";

export default {
  trustHost: true,
  providers: [],
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        if (token.email) {
          session.user.email = token.email as string;
        }
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
