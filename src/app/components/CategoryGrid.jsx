'use client';
export default function CategoryGrid({ categories, articles }) {
  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Categories</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => {
          // Get up to 3 article headlines for this category
          const categoryArticles = articles.filter((article) => article.category === category.name).slice(0, 3);
          return (
            <div key={category.id} className="border border-gray-300 rounded p-4">
              <h3 className="text-lg font-bold text-gray-900 capitalize mb-2">{category.name}</h3>
              {categoryArticles.length > 0 ? (
                <ul className="list-disc pl-5">
                  {categoryArticles.map((article) => (
                    <li key={article.id} className="text-sm text-gray-700">
                      {article.title}
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