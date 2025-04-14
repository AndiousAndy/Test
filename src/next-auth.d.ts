import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";
import { Decimal } from '@prisma/client/runtime/library';

// Extend the built-in session types
declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's unique ID. */
      id: string;
      /** The user's username. */
      username?: string | null;
      /** The user's balance. */
      balance?: Decimal | null;
      /** The user's admin status. */
      isAdmin?: boolean;
    } & DefaultSession["user"]; // Keep existing properties like name, email, image
  }

  // Extend the built-in User type (used in callbacks like authorize, jwt)
  interface User extends DefaultUser {
    username?: string | null;
    balance?: Decimal | null;
    isAdmin?: boolean;
  }
}

// Extend the built-in JWT type
declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT extends DefaultJWT {
    /** OpenID ID Token */
    id?: string;
    username?: string | null;
    balance?: Decimal | null;
    isAdmin?: boolean;
  }
}
