"use client";

import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  // No longer need SessionProvider since we're using Supabase Auth directly
  return <>{children}</>;
}
