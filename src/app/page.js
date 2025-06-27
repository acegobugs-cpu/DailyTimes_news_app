'use client';
import MainStory from './components/MainStory';
import MoreStories from './components/MoreStories';
import CategoryGrid from './components/CategoryGrid';
import {articles, categories} from './data/articles';

export default function Home() {

  const mainStories = articles.filter((article) =>
    ["breaking news", "trending", "primary", "secondary"].includes(article.priority)
  );
  const moreStories = articles.filter((article) => article.priority === "morestories");

  return (
    <>
      <MainStory stories={mainStories} />
      <MoreStories stories={moreStories} />
      <CategoryGrid categories={categories} articles={articles}/>
    </>
  );
}
