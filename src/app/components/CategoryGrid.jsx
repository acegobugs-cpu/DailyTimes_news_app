'use client';
export default function CategoryGrid({ categories}) {
  
  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b">Categories</h2>
      <div className="max-w-7xl mx-auto px-4 py-4 md:grid md:grid-cols-3 gap-3">
        {categories.map((category) => {
          const categoryArticles = category.articles.slice(0, 3);
          return (
            <div key={category.CID} className="">
              <h4 className="font-bold text-lg mb-2 border-b border-t pb-1"><a href={category.path}>{category.name}</a></h4>
              {categoryArticles.length > 0 ? (
                <ul className="space-y-2">
                  {categoryArticles.map((article) => (
                    <li key={article.id} className="text-sm text-gray-700 hover:underline cursor-pointer">
                      {article.Title}
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
