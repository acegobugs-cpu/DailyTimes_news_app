
export default function Secondary({stories}){
    return (
        <div className="md:col-span-1 md:order-1 md:border-r md:border-[#211C84]">
        {stories.map((story) => (
          <article key={story.AID} className="grid grid-rows-1 md:grid-rows-2 gap-4 p-2 overflow">
            {story.image?.map((item, index) => {
              if (item.__component === "imageurl.imageurl") {
                return <img
                  key={index}
                  src={item.url || null}
                  alt="Main headline image"
                  className="w-full h-full object-cover "
                />;
              } else if (item.__component === "image.image") {
                return <img
                  key={index}
                  src={item.image?.url ? `http://192.168.0.110:1337${item.image.url}` : null}
                  alt="Main headline image"
                  className="w-full h-auto object-cover "
                />;
              } else if (item.__component === "videoembed.videoembed") {
                return <iframe
                  key={index}
                  src={item.videoembed || null}
                  title="Video Embed"
                  className="w-full h-auto aspect-video "
                />;
              }
              return null;
            }).find(url => url !== null)}
            <div className="flex flex-col justify-center">
              <p className="text-xs md:text-sm text-gray-500">
                {story.category
                  ?.filter(cat => cat?.name)
                  .map(cat => cat.name)
                  .join(' | ')}
              </p>
              <h2 className="text-base md:text-xl font-serif font-bold mb-4">
                <a href={`/article/${story.AID}`}>{story.Title}</a>
              </h2>
              <p className="text-sm md:text-base text-gray-700 overflow-hidden">{story.description} </p>
            </div>
            <hr className="border-gray-300" />
          </article>
        ))}
      </div>
    );
}