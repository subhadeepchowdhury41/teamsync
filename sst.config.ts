import { SSTConfig } from "sst";

// Define the stack function using a different approach
const config = {
  config() {
    return {
      name: "teamsync",
      region: "us-east-1",
    };
  },
  async stacks(app: any) {
    // Import the NextjsSite construct inside the stacks function
    const { Resource } = await import("sst");
    
    app.stack(({ stack }: { stack: any }) => {
      // Create the site with NextjsSite construct
      const site = new Resource.App(stack, "site", {
        environment: {
          // Database
          DATABASE_URL: process.env.DATABASE_URL || "",
          
          // NextAuth
          NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "",
          NEXTAUTH_URL: process.env.NEXTAUTH_URL || "",
          
          // OAuth providers
          GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
          GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
          GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
          GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
        },
      });
      
      // Add outputs
      stack.addOutputs({
        SiteUrl: site.url || "",
      });
    });
  },
};

// Export as ESM module
export default config satisfies SSTConfig;
