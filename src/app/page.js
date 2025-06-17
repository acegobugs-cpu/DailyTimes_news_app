'use client';
import { MainSearchBar, useSearch } from './components/SearchBar';
import MainStory from './components/MainStory';
import MoreStories from './components/MoreStories';
import CategoryGrid from './components/CategoryGrid';
import {articles, categories} from './data/articles';

export default function Home() {
  const { searchValue } = useSearch();

  // Filter stories and categories based on searchValue
  const filteredArticles = articles.filter(
    (article) =>
      article.priority.toLowerCase().includes(searchValue.toLowerCase()) ||
      article.title.toLowerCase().includes(searchValue.toLowerCase()) ||
      article.description.toLowerCase().includes(searchValue.toLowerCase())
  );

  const mainStories = filteredArticles.filter((article) =>
    ["breaking news", "trending", "primary", "secondary"].includes(article.priority)
  );
  const moreStories = filteredArticles.filter((article) => article.priority === "morestories");

  return (
    <>
      <MainSearchBar />
      <MainStory searchTerm={searchValue} stories={mainStories} />
      <MoreStories stories={moreStories} />
      <CategoryGrid categories={categories} articles={articles}/>
    </>
  );
}
