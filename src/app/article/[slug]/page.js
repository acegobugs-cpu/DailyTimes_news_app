'use server';
// app/article/[id]/page.js
import { fetchArticleById, fetchArticles } from '../../lib/fetch';
import ContentRenderer from '../../components/ContentRenderer';

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
      title: article.Title,
      description: article.description,
      openGraph: {
        title: article.Title,
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
  const { slug } = await params; // Await params to access id

  try {
    const article = await fetchArticleById(slug);

    if (!article) {
      return (
        <main className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-gray-700">Article not found.</p>
        </main>
      );
    }
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <article>
          <h1 className="text-2xl md:text-4xl font-serif font-bold text-[#211C84] mb-4">
            {article.Title}
          </h1>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <p className="text-sm text-gray-500">
                {Array.isArray(article.category) && article.category.length > 0
                  ? article.category.map(cat=> cat.name).join(' | ')
                  : 'Uncategorized'}
              </p>
              <p className="text-sm text-gray-500">Author: {article.author} | {article.date}</p>
            </div>
            <div className="flex-1">
              {article.image?.map(item => {
                if (item.__component === "imageurl.imageurl") {
                  return (
                    <img
                      key={item.id}
                      src={item.url || '/placeholder.jpg'}
                      alt="Main headline image"
                      className="max-w-full h-auto object-cover rounded aspect-[3/2] max-h-64 md:max-h-96"
                    />
                  );
                } else if (item.__component === "image.image") {
                  return (
                    <img
                      key={item.id}
                      src={item.image?.url ? `${process.env.NEXT_PUBLIC_API_URL}${item.image.url}` : '/placeholder.jpg'}
                      alt="Main headline image"
                      className="max-w-full h-auto object-cover rounded aspect-[3/2] max-h-64 md:max-h-96"
                    />
                  );
                } else if (item.__component === "videoembed.videoembed") {
                  return (
                    <iframe
                      key={item.id}
                      src={item.videoembed || ''}
                      title="Video Embed"
                      className="w-full h-auto aspect-video"
                      allowFullScreen
                      loading="lazy"
                      sandbox="allow-scripts allow-same-origin allow-presentation"
                    />
                  );
                }
                return null;
              }).filter(Boolean)[0] || <p>No media available</p>}
            </div>
          </div>
          <p className="text-base text-gray-700 mb-6 line-clamp-3">{article.description}</p>
          <ContentRenderer content={article.content} />
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
