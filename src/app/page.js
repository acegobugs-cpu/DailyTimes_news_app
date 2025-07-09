export const dynamic = 'force-dynamic';

import Primary from './components/Primary';
import Secondary from './components/Secondary';
import MoreStories from './components/MoreStories';
import CategoryGrid from './components/CategoryGrid';
import { fetchArticles, fetchCategories} from './lib/fetch';



export default async function Home() {
  const [articles, categories] = await Promise.all([
    fetchArticles(),
    fetchCategories(),
  ]);

  const primaryStories = articles.filter((article) =>['breaking news', 'trending', 'primary'].includes(article.tag));
  const secondaryStories = articles.filter((article) => article.tag=== 'secondary');
  const moreStories = articles.filter((article) => article.tag === 'morestories');

  return (
    <>
      <section className="max-w-6xl mx-auto md:px-3 py-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Primary stories={primaryStories} />
        <Secondary stories={secondaryStories} />
      </section>
      <MoreStories stories={moreStories} />
      <CategoryGrid categories={categories} articles={articles} />
    </>
  );
}