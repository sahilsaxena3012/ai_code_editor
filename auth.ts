import NextAuth from "next-auth";

import { PrismaAdapter } from "@auth/prisma-adapter";

import authConfig from "./auth.config";
import { db } from "./lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token }) {
      if (!token.sub) return token;

      const user = await db.user.findUnique({
        where: {
          id: token.sub,
        },
      });

      if (!user) return token;

      token.role = user.role;

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role;
      }

      return session;
    },
  },

  ...authConfig,
});
