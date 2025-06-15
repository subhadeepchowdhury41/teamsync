import React from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import Layout from "../components/layout/Layout";

// Use dynamic import with SSR disabled to prevent hydration errors
const NotificationContent = dynamic(
  () => import("../components/notification/NotificationContent"),
  { ssr: false }
);

const NotificationTest: React.FC = () => {
  return (
    <>
      <Head>
        <title>TeamSync - Notifications Test</title>
        <meta name="description" content="Notifications management for TeamSync" />
      </Head>
      <Layout>
        <NotificationContent />
      </Layout>
    </>
  );
};

export default NotificationTest;
