"use client";

import { useState } from "react";
import Panel from "./components/panel";
import Nav from "./components/nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [panel, setPanel] = useState(true);

  return (
    <>
      <Nav panel={panel} setPanel={setPanel} />
      <Panel panel={panel} />
      <main
        className={`mt-[4.5rem] p-4 ${
          panel ? "ml-52" : ""
        } transition-all duration-300`}
      >
        {children}
      </main>
    </>
  );
}
