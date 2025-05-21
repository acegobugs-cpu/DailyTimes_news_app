// app/components/SearchBar.jsx
'use client';
import { useState } from 'react';

export default function SearchBar({ onSearch }) {
  const [value, setValue] = useState('');
  
  const handleChange = (e) => {
    const term = e.target.value;
    setValue(term);
    onSearch(term);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Search articles..."
        className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring"
      />
    </div>
  );
}
