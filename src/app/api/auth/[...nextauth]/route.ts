import NextAuth, { type NextAuthOptions, User as NextAuthUser, Session } from 'next-auth'; 
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaClient, User as PrismaUser } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Decimal } from '@prisma/client/runtime/library'; 
import prisma from '@/lib/prisma'; 

const prismaClient = new PrismaClient();

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

        // Fetch only necessary fields
        const user = await prismaClient.user.findUnique({
          where: {
            email: credentials.email
          },
          select: { // Select only fields needed for auth and session
            id: true,
            username: true,
            email: true,
            password: true,
            balance: true,
            isAdmin: true
          }
        });

        if (!user || !user.password) { // Ensure user and password exist
          return null;
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.password);

        if (!isValidPassword) {
          return null;
        }

        // Return object matching the augmented NextAuth User type
        return {
          id: user.id,
          email: user.email, 
          username: user.username, 
          balance: user.balance, 
          isAdmin: user.isAdmin // Include isAdmin here
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
      // Initial sign in - add user details to token
      if (user) { 
        token.id = user.id;
        token.username = user.username; 
        token.balance = user.balance;   
        token.isAdmin = user.isAdmin; 
        token.email = user.email; 
      }

      // On session update OR if token exists (subsequent requests), refresh balance
      if (trigger === "update" || token.id) {
        try {
          const dbUser = await prismaClient.user.findUnique({
            where: { id: token.id as string }, // Use token.id from initial sign in
            select: { balance: true },
          });
          if (dbUser) {
            token.balance = dbUser.balance; // Update balance in token
          } else {
            console.error(`JWT Callback: User with id ${token.id} not found in DB.`);
            // Potentially invalidate token here if user not found?
          }
        } catch (error) {
          console.error('JWT Callback: Error fetching user balance:', error);
        }
      }

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      if (session.user) {
        // Use 'any' assertion temporarily to bypass stubborn TS error
        // Ideally, the types from next-auth.d.ts should handle this.
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).balance = token.balance;
        (session.user as any).isAdmin = token.isAdmin;
        // session.user.email is usually part of the base type
      }
      return session;
    }
  },
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
