import { inferAsyncReturnType } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { type Session } from "next-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import { db } from "../db-serverless";

type CreateContextOptions = {
  session: Session | null;
};

/**
 * This helper generates the "context" object for the tRPC API
 */
export const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    db,
  };
};

/**
 * This is the actual context you will use in your router
 * @link https://trpc.io/docs/context
 */
export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;

  // Get the session from the server using the getServerSession wrapper function
  const session = await getServerSession(req, res, authOptions);

  return createInnerTRPCContext({ session });
};

export type Context = inferAsyncReturnType<typeof createTRPCContext>;
