'use client';
import { MainSearchBar, useSearch } from './components/SearchBar';
import MainStory from './components/MainStory';
import MoreStories from './components/MoreStories';
import CategoryGrid from './components/CategoryGrid';

const stories = [
  { id: 1, title: "Arctic Expedition Saves Wildlife", summary: "Conservationists brave harsh conditions to rescue polar bears and seals trapped by melting ice, highlighting the impact of climate change." },
  { id: 2, title: "Global Peace Summit in Addis Ababa", summary: "Leaders from across the globe gather to negotiate peace agreements in a historic summit aimed at ending years of conflict and rebuilding trust between nations." },
  { id: 3, title: "AI Breakthrough in Healthcare", summary: "Scientists unveil a quantum processor that promises to solve complex problems in seconds, potentially transforming industries from medicine to cryptography." },
];

const moreStories = [
  { id: 1, title: "Tech Giants Face New EU Regulations", summary: "The European Union unveils stricter digital laws targeting monopoly behavior." },
  { id: 2, title: "NASA Plans New Moon Mission", summary: "The Artemis program aims to send humans back to the Moon by 2026." },
  { id: 3, title: "Climate Talks Stall at Summit", summary: "Disagreements over emission cuts cause delays in international climate agreements." },
];

const categories = [
  { id: 1, name: "Technology", stories: ["AI beats doctors in early cancer detection", "Open-source projects dominate 2025 tools"] },
  { id: 2, name: "Sports", stories: ["Champions League final ends in upset", "Olympics prep ramps up in Paris"] },
  { id: 3, name: "Science", stories: ["James Webb finds Earth-like planet", "Fusion energy shows breakthrough progress"] },
  { id: 4, name: "Culture", stories: ["Film industry eyes global streaming deals", "Broadway sees a record-breaking revival"] },
];

export default function Home() {
  const { searchValue } = useSearch();

  // Filter stories and categories based on searchValue
  const filteredStories = stories.filter(
    (story) =>
      story.title.toLowerCase().includes(searchValue.toLowerCase()) ||
      story.summary.toLowerCase().includes(searchValue.toLowerCase())
  );

  const filteredSecondary = moreStories.filter(
    (story) =>
      story.title.toLowerCase().includes(searchValue.toLowerCase()) ||
      story.summary.toLowerCase().includes(searchValue.toLowerCase())
  );

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    category.stories.some((story) =>
      story.toLowerCase().includes(searchValue.toLowerCase())
    )
  );

  return (
    <>
      <MainSearchBar />
      <MainStory searchTerm={searchValue} stories={filteredStories.slice(0, 1)} />
      <MoreStories stories={filteredSecondary} />
      <CategoryGrid categories={filteredCategories} />
    </>
  );
}
