// app/components/SearchBar.jsx
'use client';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useLocale } from './TranslationProvider';


export function MainSearchBar({searchValue, handleSearch}) {
  const { t } = useTranslation();
  const lan = useLocale();
  const router = useRouter();
  
  const handleChange = (e) => {
    handleSearch(e.target.value); // Update searchValue and trigger search
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      router.push(`/${lan}/search/${encodeURIComponent(searchValue.trim())}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <input
        type="text"
        value={searchValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={t('search_articles')}
        className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring"
      />
    </div>
  );
}


export function HeaderSearchBar({searchValue, handleSearch}) {
  const lan = useLocale();
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleChange = (e) => {
    handleSearch(e.target.value); // Update searchValue and trigger search
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      router.push(`/${lan}/search/${encodeURIComponent(searchValue.trim())}`);
    }
  };

  const handleClick = () => {
    if (searchValue.trim()) {
      router.push(`/${lan}/search/${encodeURIComponent(searchValue.trim())}`);
    } else {
      setIsSearchOpen(!isSearchOpen);
    }
  };

  return (
    <div className="grid grid-cols-[auto_auto] items-center gap-0 justify-end">
      <div className={`transition-all duration-300 ease-in-out mr-0 ${isSearchOpen ? 'w-48 md:w-64 opacity-100' : 'w-0 opacity-0'} overflow-hidden`}>
        <input
          type="text"
          value={searchValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search articles..."
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#211C84]"
        />
      </div>
      <button onClick={handleClick} className="p-2 text-[#211C84] hover:text-gray-700 transition-colors">
        <Search size={24} />
      </button>
    </div>
  );
}

