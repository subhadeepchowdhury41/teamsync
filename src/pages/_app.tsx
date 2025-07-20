import { GeistSans } from "geist/font/sans";
import { type AppType } from "next/app";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { api } from "../utils/api";
import { useEffect } from "react";
import { initializeServer } from "../server/utils/serverInit";

import "@/styles/globals.css";

const MyApp: AppType<{ session: Session | null }> = ({ 
  Component, 
  pageProps: { session, ...pageProps } 
}) => {
  // Initialize server components on first render
  useEffect(() => {
    initializeServer();
  }, []);

  return (
    <SessionProvider session={session}>
      <div className={GeistSans.className}>
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
