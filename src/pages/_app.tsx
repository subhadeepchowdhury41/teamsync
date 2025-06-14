import { GeistSans } from "geist/font/sans";
import { type AppType } from "next/app";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

import "@/styles/globals.css";

const MyApp: AppType<{ session: Session | null }> = ({ 
  Component, 
  pageProps: { session, ...pageProps } 
}) => {
  return (
    <SessionProvider session={session}>
      <div className={GeistSans.className}>
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  );
};

export default MyApp;
