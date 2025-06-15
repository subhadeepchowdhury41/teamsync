import { appRouter } from "@/server/trpc";
import { createNextApiHandler } from "@trpc/server/adapters/next";
import { createTRPCContext } from "@/server/trpc/context";

export default createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
});
