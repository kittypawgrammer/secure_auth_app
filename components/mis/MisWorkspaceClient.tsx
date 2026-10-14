"use client";

import dynamic from "next/dynamic";

// The workspace reads localStorage, which only exists in the browser,
// so it is rendered on the client only (no server render, no hydration mismatch)
export const MisWorkspaceClient = dynamic(
  () => import("./MisWorkspace").then((m) => m.MisWorkspace),
  { ssr: false, loading: () => <p className="p-6 text-sm text-gray-500">Loading…</p> }
);
