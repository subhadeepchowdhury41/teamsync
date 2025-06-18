import { SSTConfig } from "sst";
import { NextjsSite } from "sst/constructs";

export default {
  config(_app) {
    return {
      name: "teamsync",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(function Site({ stack }) {
      const site = new NextjsSite(stack, "teamsync", {
        path: ".",
        timeout: 30, // Increased timeout from default 10 seconds to 30 seconds
        memorySize: 2048, // Increased memory from 1024MB to 2048MB
        environment: {
          NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
          DATABASE_URL: process.env.DATABASE_URL!,
          NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
          API_URL: process.env.NEXTAUTH_URL!,
          NODE_ENV: process.env.NODE_ENV!,
        },
      });

      stack.addOutputs({
        SiteUrl: site.url,
      });
    });
  },
} satisfies SSTConfig;
