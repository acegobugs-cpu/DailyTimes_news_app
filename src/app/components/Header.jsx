'use client';
import { useState } from 'react';
import { Menu, X } from 'lucide-react'; // uses Lucide icons (Tailwind-friendly)

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = ["World", "Politics", "Tech", "Science", "Sports", "Culture"];

  return (
    <header className="w-full border-b border-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-serif font-bold tracking-widest">The Daily Times</h1>
          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex justify-center mt-4 space-x-6 text-sm uppercase font-medium text-gray-700">
        {navItems.map((item) => (
            <a
              key={item}
              href={`/${item.toLowerCase()}`}
              className="hover:underline"
            >
              {item}
            </a>
          ))}

        </nav>

        {/* Mobile nav */}
        {isOpen && (
          <nav className="md:hidden mt-4 flex flex-col space-y-2 text-sm uppercase font-medium text-gray-700">
            {navItems.map((item) => (
              <a key={item} href="#" className="block">{item}</a>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
