'use client';
import { useParams } from 'next/navigation';
import { articles } from '../data/articles';

export default function CategoryPage() {
  const { category } = useParams();

  // Filter articles where category array includes the requested category and matches search term
  const filteredArticles = articles.filter(
    (article) =>
      Array.isArray(article.category) && article.category.includes(category)
  );

  if (!category || typeof category !== 'string') {
     return (
       <main>
         <section className="max-w-7xl mx-auto px-4 py-8">
           <p className="text-center text-gray-700">Invalid category.</p>
        </section>
       </main>
     );
  }

  return (
    <main>
      <section className="grid md:grid-cols-3 grid-cols-1 gap-4 max-w-7xl mx-auto px-4 py-8">
        {filteredArticles.length > 0 ? (
          filteredArticles.map((article) => (
            <article key={article.id} className="grid grid-rows-2 gap-4">
              <img
                src={article.image || '/placeholder.jpg'}
                alt={`${article.title} image`}
                className="w-full h-auto object-cover rounded max-h-48 md:max-h-64"
                onError={(e) => {
                  e.target.src = '/placeholder.jpg';
                }}
              />
              <div className="flex flex-col justify-center">
                <p className="text-xs md:text-sm text-gray-500">{article.category.join(', ')}</p>
                <h2 className="text-base md:text-xl font-serif font-bold mb-4">{article.title}</h2>
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