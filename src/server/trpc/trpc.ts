import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { Context } from "./context";

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

/**
 * Create a router
 */
export const router = t.router;

/**
 * Create an unprotected procedure
 */
export const publicProcedure = t.procedure;

/**
 * Create a protected procedure - only logged in users can use this
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      // infers that `session` is non-nullable
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});
