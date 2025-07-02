
import { fetchArticlesByCategory} from '../../lib/fetch';

export default async function CategoryPage({params}) {
  const {category} = await params;
  let filteredArticles = [];
  try {
    filteredArticles = await fetchArticlesByCategory(category);
  } catch (error) {
    console.error('Failed to fetch articles:', error);
    // Consider returning an error UI or empty state
  }


  return (
    <main>
      <section className="grid md:grid-cols-3 grid-cols-1 gap-4 max-w-7xl mx-auto px-4 py-8">
        {filteredArticles.length > 0 ? (
          filteredArticles.map((article) => (
            <article key={article.id} className="grid grid-rows-2 gap-4">
              {article.image?.map((item) => {
              if (item.__component === "imageurl.imageurl") {
                return <img
                  key={item.id}
                  src={item.url || null}
                  alt="Main headline image"
                  className="w-full h-full object-cover "
                />;
              } else if (item.__component === "image.image") {
                return <img
                  key={item.id}
                  src={item.image?.url ? `${process.env.NEXT_PUBLIC_API_URL}${item.image.url}` : '/placeholder.jpg'}
                  alt="Main headline image"
                  className="w-full h-auto object-cover "
                />;
              } else if (item.__component === "videoembed.videoembed") {
                return <iframe
                  key={item.id}
                  src={item.videoembed || null}
                  title="Video Embed"
                  className="w-full h-auto aspect-video "
                />;
              }
              return null;
            }).find(url => url !== null)}
              <div className="flex flex-col justify-center">
                <p className="text-xs md:text-sm text-gray-500">{article.category.map(cat => cat.name).join(' | ')}</p>
                <h2 className="text-base md:text-xl font-serif font-bold mb-4">{article.Title}</h2>
                <p className="text-sm md:text-base text-gray-700">{article.description}</p>
              </div>
            </article>
          ))
        ) : (
          <p className="text-center col-span-1 md:col-span-3 text-gray-700">
            No stories found for {category}.
          </p>
        )}
      </section>
    </main>
  );
}