
  
  export default function CategoryGrid({categories}) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat, idx) => (
            <div key={idx}>
              <h4 className="font-bold text-lg mb-2 border-b pb-1">{cat.name}</h4>
              <ul className="space-y-2">
                {cat.stories.map((story, sidx) => (
                  <li key={sidx} className="text-sm text-gray-700 hover:underline cursor-pointer">
                    {story}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    );
  }
  