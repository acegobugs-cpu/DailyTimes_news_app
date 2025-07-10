'use client';
import MediaRenderer from "./MediaRenderer";

export default function Primary({ stories }) {
  const topArticles = stories.filter((article) => ['breaking news', 'trending', 'primary'].includes(article.tag))
    .sort((a, b) => {
      const order = { 'breaking news': 1, trending: 2, primary: 3 };
      return order[a.tag] - order[b.tag];
    });

    return ( 
      <div className="md:col-span-3 md:order-2 ">
        {topArticles.map((story) => (
          <article
            key={story.id}
            className={` md:grid flex-cols justify-center md:grid-cols-2 gap-4 p-2 relative ${
              story.tag=== 'breaking news'
                ? 'border-t-2 border-red-500'
                : 'border-b border-black-300'
            }`}
          >
            {story.tag=== 'trending' && (
              <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded z-10">
                Trending
              </div>
            )}
            {story.tag === 'breaking news' && (
              <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded z-10 shadow-[0_0_6px_rgba(239,68,68,0.8)]">
                Breaking News
              </div>
            )}
            {story.media&&<MediaRenderer media={typeof story.media === 'string' ? JSON.parse(story?.media) : story.media} className="w-full h-auto object-cover aspect-video" autoPlay  />}
            <div className="flex flex-col gap-2">
              <p className="text-xs md:text-sm text-gray-500 order-1">
                {story.categories
                  ?.filter(cat => cat?.name)
                  .map(cat => cat.name)
                  .join(' | ')}
              </p>
              <h2 className="text-lg md:text-3xl font-serif font-bold order-2"><a href={`/article/${story.slug}`}>{story.title}</a></h2>
              <p className="text-sm md:text-base text-gray-700 order-3">{story.description}</p>
            </div>
          </article>
        ))}
      </div>      
  );
}
//comments