// app/components/SearchBar.jsx
'use client';
import { Search } from 'lucide-react';
import { createContext, useContext, useState } from 'react';

const SearchContext = createContext();

export function SearchProvider({ children }) {
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = (term) => {
    setSearchValue(term);
    // Replace with actual search logic
  };

  return (
    <SearchContext.Provider value={{ searchValue, setSearchValue, handleSearch }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  return useContext(SearchContext);
}


export function MainSearchBar({ onSearch }) {
  const { searchValue, handleSearch } = useSearch();
  
  const handleChange = (e) => {
    handleSearch(e.target.value); // Update searchValue and trigger search
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <input
        type="text"
        value={searchValue}
        onChange={handleChange}
        placeholder="Search articles..."
        className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring"
      />
    </div>
  );
}


export function HeaderSearchBar() {
  const { searchValue, handleSearch } = useSearch();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleChange = (e) => {
    handleSearch(e.target.value); // Update searchValue and trigger search
  };


  return (
    <div className="grid grid-cols-[auto_auto] items-center gap-0 justify-end">
      <div className={`transition-all duration-300 ease-in-out mr-0 ${isSearchOpen ? 'w-48 md:w-64 opacity-100' : 'w-0 opacity-0'} overflow-hidden`}>
        <input
          type="text"
          value={searchValue}
          onChange={handleChange}
          placeholder="Search articles..."
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#211C84]"
        />
      </div>
      <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="p-2 text-[#211C84] hover:text-gray-700 transition-colors">
        <Search size={24} />
      </button>
    </div>
  );
}