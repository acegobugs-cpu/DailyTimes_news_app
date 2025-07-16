'use client';
import { useTranslation } from 'react-i18next';

export default function CategoryGrid({ categories}) {
  const {t} = useTranslation();
  
  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b">{t('categories')}</h2>
      <div className="max-w-7xl mx-auto px-4 py-4 md:grid md:grid-cols-3 gap-3">
        {categories.map((category) => {
          const categoryArticles = typeof category.articles === 'string' ? JSON.parse(category.articles) : category.articles;
          const articles = categoryArticles.slice(0, 3);
          return (
            <div key={category.id} className="">
              <h4 className="font-bold text-lg mb-2 border-b border-t pb-1"><a href={`/section/${category.slug}`}>{category.name}</a></h4>
              {articles.length > 0 ? (
                <ul className="space-y-2">
                  {articles.map((article) => (
                    <li key={article.slug} className="text-sm text-gray-700 hover:underline cursor-pointer">
                       <a href={`/article/${article.slug}`}>{article.title}</a>
                    </li>
                  ))}
                </ul>
                
              ) : (
                <p className="text-sm text-gray-500">No articles available</p>
              )}
              
            </div>
          );
        })}
      </div>
    </section>
  );
}
