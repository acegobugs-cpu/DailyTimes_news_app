'use client';
import { useState, useEffect, useRef } from 'react';
import { Menu, X} from 'lucide-react';
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid';
import { Listbox } from "@headlessui/react";
import {MainSearchBar, HeaderSearchBar} from './SearchBar';

import { useTranslation } from 'react-i18next';
import { usePathname, useRouter} from 'next/navigation';
import { useLocale } from './TranslationProvider'; // from your context


function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLocale = useLocale(); // e.g., 'en'
  const router = useRouter();
  const pathname = usePathname();    // e.g., /en/article/123
  const [pendingLng, setPendingLng] = useState(null);
  const languages = ["om", "am", "en"];

  const handleChange = (lng) => {
    if (lng === currentLocale) return;

    const segments = pathname.split("/");
    segments[1] = lng;
    const newPath = segments.join("/");

    setPendingLng(lng);
    router.push(newPath);
  };

  useEffect(() => {
    if (pendingLng && pathname.startsWith(`/${pendingLng}`)) {
      i18n.changeLanguage(pendingLng);
      setPendingLng(null);
    }
  }, [pathname, pendingLng, i18n]);

  return (
    currentLocale && (
      <div className="relative w-28 md:w-36 z-50">
        <Listbox value={currentLocale} onChange={handleChange}>
          <div className="relative">
            <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-gray-300 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200">
              <span className="block truncate">{currentLocale.toUpperCase()}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>

          <Listbox.Options className="absolute mt-1 w-full max-h-60 overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            {languages.map((lng) => (
              <Listbox.Option
                key={lng}
                value={lng}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    active ? "bg-blue-100 text-blue-900" : "text-gray-900"
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? "font-semibold" : "font-normal"}`}>
                      {lng.toUpperCase()}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                        <CheckIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
    )
  );
}

export default function Header({sections}) {
  const lan = useLocale();
  const [searchValue, setSearchValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(200);
  const sidePanelRef = useRef(null);
  const navRef = useRef(null);
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    const amount = 150;
    navRef.current?.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
    scrollRef.current?.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  }

  const onSearch = (value) => {
    setSearchValue(value);
  };


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
      } else if (currentScrollY < 400) {
        setIsScrolledDown(false);
      } else if (currentScrollY < lastScrollY && searchValue.trim() === '') {
        setIsScrolledDown(false);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  

  return (
    <>
      <header className="w-full border-b-2 border-[#211C84]">
        <div className="max-w-7xl mx-auto p-4">
          <div className=" relative flex justify-between items-center">
            <h1 className="md:text-3xl text-xl font-serif font-bold tracking-widest text-[#211C84]">
              <a href={`/${lan}`}>The Daily Times</a>
            </h1>
            <div className='hidden md:block'>
            <LanguageSwitcher />
            </div>
            <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Desktop nav */}
          <div className="relative mt-4 hidden md:flex mx-auto max-w-lg">
            {/* Left button */}
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded z-10"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            {/* Scrollable nav */}
            <nav
              ref={navRef}
              className="flex overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory 
                        space-x-3 text-sm uppercase font-medium text-gray-700 mx-10"
            >
              {sections.map((item) => (
                <a
                  key={item.id}
                  href={`/${lan}/section/${item.slug}`}
                  className="snap-start shrink-0 hover:underline whitespace-nowrap"
                >
                  {item.name}
                </a>
              ))}
            </nav>

            {/* Right button */}
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded z-10"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

        </div>

        {/* Mobile nav */}
        <nav
          ref={sidePanelRef}
          className={`md:hidden fixed top-0 right-0 h-screen w-48 bg-[#ededed] border-l border-[#211C84] shadow-lg z-40 transform transition-transform duration-300 ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className='absolute top-4 md:hidden'>
            <LanguageSwitcher />
          </div>
          <button
            className="absolute top-4 right-4 md:hidden"
            onClick={() => setIsOpen(false)}
          >
            <X size={24} />
          </button>
          <div className="flex flex-col space-y-6 p-4 pt-16 text-sm uppercase font-medium text-gray-700">
            {sections.map((item) => (
              <a key={item.slug} href={`/${lan}/section/${item.slug}`} className="hover:underline">
                {item.name}
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
          <div className="relative mt-4 hidden md:flex mx-auto max-w-lg">
            {/* Left button */}
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-[#ededed] px-2 py-1 rounded z-10"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            {/* Scrollable nav */}
            <nav
              ref={scrollRef}
              className="flex overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory 
                        space-x-3 text-sm uppercase font-medium text-gray-700 mx-10"
            >
              {sections.map((item) => (
                <a
                  key={item.slug}
                  href={`/${lan}/section/${item.slug}`}
                  className="snap-start shrink-0 hover:underline whitespace-nowrap"
                >
                  {item.name}
                </a>
              ))}
            </nav>

            {/* Right button */}
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#ededed] hover-blue px-2 py-1 rounded z-10"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="col-span-1 z-[-50]"></div> {/* Spacer */}
          <HeaderSearchBar searchValue={searchValue} handleSearch={onSearch}/>
        </nav>
      </header>
      <MainSearchBar searchValue={searchValue} handleSearch={onSearch}/>
    </>
  );
}

