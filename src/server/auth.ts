import { PrismaAdapter } from "@auth/prisma-adapter";
import { type GetServerSidePropsContext } from "next";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import { type Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { db } from "@/server/db-serverless";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
      // ...other properties
      // role: UserRole;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    hashedPassword?: string | null;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  callbacks: {
    session: ({ session, token }) => {
      try {
        return {
          ...session,
          user: {
            ...session.user,
            id: token.sub,
          },
        };
      } catch (error) {
        console.error("Session callback error:", error);
        // Return a minimal valid session to prevent 500 errors
        return { 
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          user: { id: token.sub || "unknown" } 
        };
      }
    },
    jwt: ({ token, user }) => {
      try {
        if (user) {
          token.id = user.id;
        }
        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        return token;
      }
    },
  },
  // Use PrismaAdapter with error handling
  adapter: {
    ...PrismaAdapter(db),
    // Override methods that might cause 500 errors with more resilient versions
    async createUser(data: any) {
      try {
        return await db.user.create({ data });
      } catch (error) {
        console.error('Error creating user:', error);
        throw error;
      }
    },
    async getUser(id: string) {
      try {
        return await db.user.findUnique({ where: { id } });
      } catch (error) {
        console.error('Error getting user:', error);
        return null;
      }
    },
    async getUserByEmail(email: string) {
      try {
        return await db.user.findUnique({ where: { email } });
      } catch (error) {
        console.error('Error getting user by email:', error);
        return null;
      }
    },
  } as Adapter,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const user = await db.user.findUnique({
            where: {
              email: credentials.email
            }
          }) as any; // Type assertion to bypass Prisma type issues

          if (!user?.hashedPassword) {
            return null;
          }

          const isPasswordValid = await compare(
            credentials.password,
            user.hashedPassword
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image
          };
        } catch (error) {
          console.error('Authorization error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};
