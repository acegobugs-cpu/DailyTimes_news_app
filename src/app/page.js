// app/page.js
'use client';
import { useState } from 'react';
import MainStory from './components/MainStory';
import SecondaryStories from './components/SecondaryStories';
import CategoryGrid from './components/CategoryGrid';
import SearchBar from './components/SearchBar';

const initialSecondary = [
  { title: "Tech Giants Face New EU Regulations", summary: "The European Union unveils stricter digital laws targeting monopoly behavior." },
  { title: "NASA Plans New Moon Mission", summary: "The Artemis program aims to send humans back to the Moon by 2026." },
  { title: "Climate Talks Stall at Summit", summary: "Disagreements over emission cuts cause delays in international climate agreements." },
];

const initialCategories = [
  { name: "Technology", stories: ["AI beats doctors in early cancer detection", "Open-source projects dominate 2025 tools"] },
  { name: "Sports", stories: ["Champions League final ends in upset", "Olympics prep ramps up in Paris"] },
  { name: "Science", stories: ["James Webb finds Earth-like planet", "Fusion energy shows breakthrough progress"] },
  { name: "Culture", stories: ["Film industry eyes global streaming deals", "Broadway sees a record-breaking revival"] },
];

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');

  // Case-insensitive filter helper
  const matches = (text) =>
    text.toLowerCase().includes(searchTerm.toLowerCase());

  const filteredSecondary = initialSecondary.filter(
    (s) => matches(s.title) || matches(s.summary)
  );

  const filteredCategories = initialCategories
    .map((cat) => ({
      ...cat,
      stories: cat.stories.filter(matches),
    }))
    .filter((cat) => cat.stories.length > 0);

  return (
    <>
      <SearchBar onSearch={setSearchTerm} />
      <MainStory />
      <SecondaryStories stories={filteredSecondary} />
      <CategoryGrid categories={filteredCategories} />
    </>
  );
}
