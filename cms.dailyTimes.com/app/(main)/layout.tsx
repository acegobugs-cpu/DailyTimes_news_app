"use client";

import { useState, useEffect } from "react";
import Panel from "./components/panel";
import Nav from "./components/nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [panel, setPanel] = useState(false);

  // refreshUser();

  return (
    <>
      <Nav />
      <Panel panel={panel} setPanel={setPanel} />
      <main
        className={`mt-14 ml-16 flex items-center justify-center ${
          panel ? "ml-68" : ""
        } transition-all duration-300`}
      >
        {children}
      </main>
    </>
  );
}
