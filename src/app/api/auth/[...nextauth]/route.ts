import NextAuth, { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { auditHooks } from "@/middleware/audit";
import { compare } from "bcrypt";

import type { Session } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      }
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async signIn({ user, account, profile }) {
      try {
        // Log successful sign-in attempt
        await auditHooks.logLoginAttempt(
          user.email || 'unknown',
          'unknown', // IP address not available in callback
          'unknown', // User agent not available in callback
          true,
          user.id
        );
      } catch (error) {
        console.error('Failed to log sign-in audit event:', error);
      }
      return true;
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      try {
        if (isNewUser) {
          // Log new user registration
          await auditHooks.logLoginAttempt(
            user.email || 'unknown',
            'unknown',
            'unknown',
            true,
            user.id
          );
        }
      } catch (error) {
        console.error('Failed to log sign-in event audit:', error);
      }
    },
    async signOut({ session, token }) {
      try {
        // Log sign-out event
        const userId = session?.user?.id || token?.sub;
        const userEmail = session?.user?.email || token?.email;
        
        if (userId && userEmail) {
          await auditHooks.logLoginAttempt(
            userEmail,
            'unknown',
            'unknown',
            true,
            userId
          );
        }
      } catch (error) {
        console.error('Failed to log sign-out audit event:', error);
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
