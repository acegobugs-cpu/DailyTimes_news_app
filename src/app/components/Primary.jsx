'use client';

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
            key={story.AID}
            className={` grid grid-cols-1 md:grid-cols-2 gap-4 p-2 relative ${
              story.tag=== 'breaking news'
                ? 'border-t-2 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
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
            {story.image?.map(item => {
                    if (item.__component === "imageurl.imageurl") {
                      return <img
                        src= {item.url|| null}
                        alt="Main headline image"
                        className="w-full h-auto object-cover"
                      />
                      
                    } else if (item.__component === "image.image") {
                      return <img
                        src= {item.image?.url ? `http://192.168.0.110:1337${item.image.url}` : null}
                        alt="Main headline image"
                        className="w-full h-auto object-cover"
                      />
                      
                    }else if (item.__component === "videoembed.videoembed"){
                      return <iframe
                        src={item.videoembed || null}
                        title="Video Embed"
                        className="w-full h-auto aspect-video "
                        allowFullScreen
                      ></iframe>;
                    }
                    return null;
                  }).find(url => url !== null)} 
            <div className="flex flex-col justify-center">
              <p className="text-xs md:text-sm text-gray-500 mb-2">
                {story.category
                  ?.filter(cat => cat?.name)
                  .map(cat => cat.name)
                  .join(' | ')}
              </p>
              <h2 className="text-lg md:text-3xl font-serif font-bold mb-4"><a href={`/article/${story.AID}`}>{story.Title}</a></h2>
              <p className="text-sm md:text-base text-gray-700">{story.description} </p>
            </div>
          </article>
        ))}
      </div>      
  );
}
//comments