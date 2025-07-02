'use client';
import Image from 'next/image';

export default function ContentRenderer({ content }) {
  if (!content || !Array.isArray(content)) return <p>No content available.</p>;
  
  return (
    <div className="space-y-4">
      {content.map((block) => {
        switch (block.__component) {
          case 'header.header':
            return (
              <h2 key={block.id} className="text-2xl font-bold text-gray-900">
                {block.header}
              </h2>
            );
          case 'paragraph.paragraph':
            return (
              <p key={block.id} className="text-base text-gray-700">
              {block.paragraph}
              </p>
            );
          case 'media.media':
            return (
              <div key={block.id} className="my-4">
                {Array.isArray(block.media) && block.media.map((mediaItem) => (
                  <figure key={mediaItem.id} className="my-2">
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL}${mediaItem.url}`}
                      alt={mediaItem.alternativeText || ''}
                      className="w-auto h-auto rounded"
                    />
                  </figure>
                ))}
              </div>
            );
          case 'image.image':
            return (
              <figure key={block.id} className="my-4">
                <Image
                  src={block.media.url}
                  alt={block.alt}
                  width={800}
                  height={450}
                  className="w-full h-auto rounded"
                />
              </figure>
            );
          case 'quote.quote':
            return (
              <blockquote key={block.id} className="border-l-4 border-[#211C84] pl-4 italic text-gray-700">
                <p>{block.quote}</p>
              </blockquote>
            );
          case 'video':
            return (
              <figure key={block.id} className="my-4">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    src={block.embed}
                    title={block.caption || 'Video'}
                    className="absolute top-0 left-0 w-full h-full rounded"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                {block.caption && (
                  <figcaption className="text-sm text-gray-500 mt-2">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}