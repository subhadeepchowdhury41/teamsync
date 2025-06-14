import type { SSTConfig } from "sst";
import { NextjsSite } from "sst/constructs";

export default {
  config(_input: any) {
    return {
      name: "teamsync",
      region: "us-east-1",
    };
  },
  stacks(app: any) {
    app.stack(function Site({ stack }: { stack: any }) {
      const site = new NextjsSite(stack, "site", {
        customDomain: {
          domainName:
            stack.stage === "prod" ? "teamsync.com" : `${stack.stage}.teamsync.com`,
          domainAlias:
            stack.stage === "prod" ? "www.teamsync.com" : undefined,
        },
        environment: {
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        },
      });

      stack.addOutputs({
        SiteUrl: site.url,
      });
    });
  },
} satisfies SSTConfig;
