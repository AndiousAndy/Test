import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";
import { Decimal } from "@prisma/client/runtime/library"; 

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username?: string | null; 
      balance?: Decimal | null; 
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    username?: string | null; 
    balance?: Decimal | null; 
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    username?: string | null; 
    balance?: Decimal | null; 
  }
}
