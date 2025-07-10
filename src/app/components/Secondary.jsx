import MediaRenderer from "./MediaRenderer";
export default function Secondary({stories}){
    return (
        <div className="md:col-span-1 md:order-1 md:border-r md:border-[#211C84]">
        {stories.map((story) => (
          <article key={story.id} className="flex-cols justify-center gap-4 p-2 overflow">
            {story.media&&<MediaRenderer media={typeof story.media === 'string' ? JSON.parse(story.media) : story.media} className="w-full h-auto object-cover aspect-video" autoPlay  />}
            <div className="flex flex-col justify-center">
              <p className="text-xs md:text-sm text-gray-500">
                {story.categories
                  ?.filter(cat => cat?.name)
                  .map(cat => cat.name)
                  .join(' | ')}
              </p>
              <h2 className="text-base md:text-xl font-serif font-bold mb-4">
                <a href={`/article/${story.slug}`}>{story.title}</a>
              </h2>
              <p className="text-sm md:text-base text-gray-700 overflow-hidden">{story.description} </p>
            </div>
            <hr className="border-gray-300" />
          </article>
        ))}
      </div>
    );
}