/**
 * This is the client-side entrypoint for your tRPC API. It is used to create the `api` object which
 * contains the Next.js App-wrapper, as well as your type-safe React Query hooks.
 *
 * We also create a few inference helpers for input and output types.
 */
import { httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import superjson from "superjson";

import { type AppRouter } from "../server/trpc";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return "";
  if (process.env.API_URL) return process.env.API_URL;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  return `http://localhost:${process.env.PORT ?? 3000}`;
};

/** A set of type-safe react-query hooks for your tRPC API. */
export const api = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
    };
  },
  ssr: false,
  transformer: superjson, // Add transformer at top level to satisfy TypeScript
});

/**
 * Inference helper for inputs.
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;
