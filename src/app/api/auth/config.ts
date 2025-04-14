import { type NextAuthOptions, User as NextAuthUser, Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import prisma from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<NextAuthUser | null> {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          select: {
            id: true,
            username: true,
            email: true,
            password: true,
            balance: true,
            isAdmin: true
          }
        });

        if (!user || !user.password) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.password);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          balance: user.balance,
          isAdmin: user.isAdmin
        };
      }
    })
  ],
  pages: {
    signIn: "/login",
    newUser: '/register'
  },
  callbacks: {
    async jwt({ token, user, trigger, session }: { token: JWT; user?: NextAuthUser; trigger?: "signIn" | "signUp" | "update"; session?: any }): Promise<JWT> {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.balance = user.balance;
        token.isAdmin = user.isAdmin;
        token.email = user.email;
      }

      if (trigger === "update" || token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { balance: true },
          });
          if (dbUser) {
            token.balance = dbUser.balance;
          } else {
            console.error(`JWT Callback: User with id ${token.id} not found in DB.`);
          }
        } catch (error) {
          console.error('JWT Callback: Error fetching user balance:', error);
        }
      }

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.balance = token.balance;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.email = token.email as string;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET
};
