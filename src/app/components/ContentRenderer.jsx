'use client';
import Image from 'next/image';

export default function ContentRenderer({ content }) {
  if (!content || !Array.isArray(content)) return null;

  return (
    <div className="space-y-4">
      {content.map((block, index) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <p key={index} className="text-base text-gray-700">
                {block.text}
              </p>
            );
          case 'image':
            return (
              <figure key={index} className="my-4">
                <Image
                  src={block.src}
                  alt={block.alt}
                  width={800}
                  height={450}
                  className="w-full h-auto rounded"
                />
                {block.caption && (
                  <figcaption className="text-sm text-gray-500 mt-2">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          case 'quote':
            return (
              <blockquote key={index} className="border-l-4 border-[#211C84] pl-4 italic text-gray-700">
                <p>{block.text}</p>
                {block.author && (
                  <cite className="block text-sm text-gray-500 mt-2">— {block.author}</cite>
                )}
              </blockquote>
            );
          case 'video':
            return (
              <figure key={index} className="my-4">
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