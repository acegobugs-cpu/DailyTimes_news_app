export const dynamic = 'force-dynamic';
// app/article/[id]/page.js
import { fetchArticleById, fetchArticles } from '../../../lib/fetch';
import ContentRenderer from '../../../components/ContentRenderer';
import MediaRenderer from '../../../components/MediaRenderer';

export async function generateStaticParams() {
  const articles = await fetchArticles();
  return articles.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params; // Await params to access id
  try {
    const article = await fetchArticleById(slug);

    if (!article) {
      return {
        title: 'Article Not Found',
        description: 'The requested article could not be found.',
      };
    }

    return {
      title: article.title,
      description: article.description,
      openGraph: {
        title: article.title,
        description: article.description,
      },
    };
  } catch (error) {
    console.error('Failed to generate metadata:', error);
    return {
      title: 'Article Not Found',
      description: 'The requested article could not be found.',
    };
  }
}

export default async function ArticlePage({ params }) {
  const { slug, locale } = await params; // Await params to access id
  try {
    const article = await fetchArticleById(slug, locale);

    if (!article) {
      return (
        <main className="max-w-7xl mx-auto px-4 py-8">
          {console.log(article)}
          <p className="text-center text-gray-700">Article not found.</p>
        </main>
      );
    }
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <article>
          <h1 className="text-2xl md:text-4xl font-serif font-bold text-[#211C84] mb-4">
            {article.translations[0].title}
          </h1>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <p className="text-sm text-gray-500">
                {Array.isArray(article.categories) && article.categories.length > 0
                  ? article.categories.map(cat=> cat.name).join(' | ')
                  : 'Uncategorized'}
              </p>
              <p className="text-sm text-gray-500">Author: {article.author} | {article.date}</p>
            </div>
            <div className="flex-1">
              {article.media&&<MediaRenderer media={typeof article.media === 'string' ? JSON.parse(article.media) : article.media} className="w-full h-auto object-cover aspect-video" autoPlay  />}
            </div>
          </div>
          <p className="text-base text-gray-700 mb-6 line-clamp-3">{article.translations[0].description}</p>
          {article.translations[0].content&&<ContentRenderer content={(() => {
            try {
              return (article.translations[0].content);
            } catch (e) {
              console.error('Failed to parse article content:', e);
              return []; // or some fallback content structure
            }
          })()} />}
        </article>
      </main>
    );
  } catch (error) {
    console.error('Failed to fetch article:', error);
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-center text-gray-700">Failed to load article. Please try again later.</p>
      </main>
    );
  }
}
