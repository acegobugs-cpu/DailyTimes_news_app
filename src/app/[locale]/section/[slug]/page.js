export const dynamic = 'force-dynamic';

import { fetchArticlesByCategory} from '../../../lib/fetch';
import MediaRenderer from '../../../components/MediaRenderer';

export default async function CategoryPage({params}) {
  const { slug, locale } = await params;
  let filteredArticles = [];
  try {
    filteredArticles = await fetchArticlesByCategory(slug, locale);
  } catch (error) {
    console.error('Failed to fetch articles:', error);
    // Consider returning an error UI or empty state
  }
  return (
    <main>
      <section className="grid md:grid-cols-3 grid-cols-1 gap-4 max-w-7xl mx-auto px-4 py-8">
        {Array.isArray(filteredArticles) && filteredArticles.length > 0 ? (
          filteredArticles.map((article) => {
            const parsedCategory = typeof article.categories === 'string' ? JSON.parse(article.categories) : article.categories;
            return (
              <article key={article.id} className="flex-cols justify-center">
                {article.media&&<MediaRenderer media={typeof article.media === 'string' ? JSON.parse(article.media) : article.media} className="w-full h-auto object-cover aspect-video" autoPlay  />}
                <div className="flex flex-col justify-center">
                  <p className="text-xs md:text-sm text-gray-500">{parsedCategory.map(cat => cat.name).join(' | ')}</p>
                  <h2 className="text-base md:text-xl font-serif font-bold mb-4"><a href={`/${locale}/article/${article.translations[0].slug}`}>{article.translations[0].title}</a></h2>
                  <p className="text-sm md:text-base text-gray-700">{article.translations[0].description}</p>
                </div>
              </article>
            );
          })
        ) : (
          <p className="text-center col-span-1 md:col-span-3 text-gray-700">
            No stories found for {slug}.
          </p>
        )}
      </section>
    </main>
  );
}