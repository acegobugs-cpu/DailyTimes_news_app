"use client";

import Panel from "./components/panel";
import Nav from "./components/nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  // refreshUser();

  return (
    <>
    <div className="flex">
      <Panel />
      <div className="w-full relative">
      <Nav />
      <main
        className={`top-15 m-4`}
      >
        {children}
      </main>
      </div>
      </div>
    </>
  );
}
