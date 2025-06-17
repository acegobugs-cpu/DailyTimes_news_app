'use client';
export default function MainStory({ stories }) {
  const topArticles = stories
    .filter((article) => ['breaking news', 'trending', 'primary'].includes(article.priority))
    .sort((a, b) => {
      const order = { 'breaking news': 1, trending: 2, primary: 3 };
      return order[a.priority] - order[b.priority];
    });

  // Filter secondary
  const secondaryArticles = stories.filter((article) => article.priority === 'secondary');

  return ( 
    <section className="max-w-7xl mx-auto md:px-4 py-8 grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="md:col-span-3 md:order-2 px-2 md:px-4">
        {topArticles.map((story) => (
          <article
            key={story.id}
            className={` grid grid-cols-1 md:grid-cols-3 gap-4 p-4 relative ${
              story.priority === 'breaking news'
                ? 'border-t-2 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                : 'border-b border-black-300'
            }`}
          >
            {story.priority === 'trending' && (
              <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded z-10">
                Trending
              </div>
            )}
            {story.priority === 'breaking news' && (
              <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded z-10 shadow-[0_0_6px_rgba(239,68,68,0.8)]">
                Breaking News
              </div>
            )}
            <img
              src={story.image}
              alt="Main headline image"
              className="w-full h-auto object-cover rounded max-h-64 md:max-h-96"
            />
            <div className="flex flex-col justify-center">
              <p className="text-xs md:text-sm text-gray-500">{story.category}</p>
              <h2 className="text-lg md:text-3xl font-serif font-bold mb-4">{story.title}</h2>
              <p className="text-sm md:text-base text-gray-700">{story.description}</p>
            </div>
          </article>
        ))}
      </div>
      {/* Secondary Section */}
      <div className="md:col-span-1 md:order-1 md:border-r md:border-[#211C84] px-2 md:px-4">
        {secondaryArticles.map((story) => (
          <article key={story.id} className="grid grid-rows-1 md:grid-rows-2 gap-4 p-4">
            <img
              src={story.image}
              alt="Arctic rescue image"
              className="w-full h-auto object-cover rounded max-h-48 md:max-h-64"
            />
            <div className="flex flex-col justify-center">
              <p className="text-xs md:text-sm text-gray-500">{story.category}</p>
              <h2 className="text-base md:text-xl font-serif font-bold mb-4">{story.title}</h2>
              <p className="text-sm md:text-base text-gray-700">{story.description}</p>
            </div>
            <hr className="border-gray-300" />
          </article>
        ))}
      </div>
    </section>
  );
}
//comments