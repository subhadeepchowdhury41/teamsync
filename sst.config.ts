/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-nextjs",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("MyBucket", {
      access: "public",
    });

    new sst.aws.Nextjs("MyWeb", {
      link: [bucket],
      path: "./",
      environment: {
        DATABASE_URL: process.env.DATABASE_URL!,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
      },
      dev: {
        command: "npm run dev",
        directory: "./",
        autostart: true,
        title: "Next.js Dev",
        url: "http://localhost:3000",
      },
    });
  },
});
