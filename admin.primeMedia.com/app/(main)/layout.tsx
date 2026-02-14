"use client";

import { useState, useEffect } from "react";
import Panel from "./components/panel";
import Nav from "./components/nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [panel, setPanel] = useState(true);

  // refreshUser();

  return (
    <>
      <Nav panel={panel} setPanel={setPanel} />
      <Panel panel={panel} />
      <main
        className={`mt-14 p-4 flex items-center justify-center ${
          panel ? "ml-52" : ""
        } transition-all duration-300`}
      >
        {children}
      </main>
    </>
  );
}
