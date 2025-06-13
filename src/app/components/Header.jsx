'use client';
import { useState, useEffect, useRef } from 'react';
import { Menu, X} from 'lucide-react';
import {HeaderSearchBar} from './SearchBar';

export default function Header({ searchTerm, setSearchTerm }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(200);
  const navItems = ["World", "Politics", "Tech", "Science", "Sports", "Culture"];
  const sidePanelRef = useRef(null);

  // Disable/enable scrolling when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [isOpen]);

  // Close side panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && sidePanelRef.current && !sidePanelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Scroll handling for scrolled nav
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 400) {
        setIsScrolledDown(true);
      } else if (currentScrollY < lastScrollY) {
        setIsScrolledDown(false);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <header className="w-full border-b-2 border-[#211C84]">
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex justify-between items-center">
          <h1 className="md:text-3xl text-xl font-serif font-bold tracking-widest text-[#211C84]">
            <a href="/">The Daily Times</a>
          </h1>
          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex justify-center mt-4 space-x-6 text-sm uppercase font-medium text-gray-700">
          {navItems.map((item) => (
            <a key={item} href={`/${item.toLowerCase()}`} className="hover:underline">
              {item}
            </a>
          ))}
        </nav>
      </div>

      {/* Mobile nav */}
      <nav
        ref={sidePanelRef}
        className={`md:hidden fixed top-0 right-0 h-full w-48 bg-[#ededed] border-l border-[#211C84] shadow-lg z-40 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <button
          className="absolute top-4 right-4 md:hidden"
          onClick={() => setIsOpen(false)}
        >
          <X size={24} />
        </button>
        <div className="flex flex-col space-y-6 p-4 pt-12 text-sm uppercase font-medium text-gray-700">
          {navItems.map((item) => (
            <a key={item} href={`/${item.toLowerCase()}`} className="block hover:underline border-b border-gray-300">
              {item}
            </a>
          ))}
        </div>
      </nav>

      {/* Scrolled fixed nav */}
      <nav
        className={`hidden md:grid grid-cols-[auto_auto_auto_auto] w-full fixed top-0 left-0 z-50 bg-[#ededed] border-b-2 border-[#211C84] px-4 py-2 items-center gap-4 transition-opacity duration-200 ${
          isScrolledDown ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <h1 className="text-xl font-serif font-bold tracking-widest text-[#211C84]">
          The Daily Times
        </h1>
        <div className='flex justify-between'>
        {navItems.map((item) => (
          <a
            key={item}
            href={`/${item.toLowerCase()}`}
            className="hover:underline text-center"
          >
            {item}
          </a>
        ))}
        </div>
        <div className="col-span-1"></div> {/* Spacer */}
        <HeaderSearchBar />
      </nav>
    </header>
  );
}

