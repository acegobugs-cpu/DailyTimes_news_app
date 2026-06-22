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
        className={`m-4 flex items-center justify-center transition-all duration-300`}
      >
        {children}
      </main>
      </div>
      </div>
    </>
  );
}
