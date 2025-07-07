'use client';
import MediaRenderer from "./MediaRenderer";

export default function ContentRenderer({ content }) {
  console.log(content);
  if (!content || !Array.isArray(content)) return <p>No content available.</p>;
  
  return (
    <div className="space-y-4">
      {content.map((block) => {
        switch (block.type) {
          case 'header':
            return (
              <h2  className="text-2xl font-bold text-gray-900">
                {block.header}
              </h2>
            );
          case 'paragraph':
            return (
              <p  className="text-base text-gray-700">
              {block.content}
              </p>
            );
          case 'media':
            return (
              <div key={block.type} className="my-4">
                <MediaRenderer media={block} className="w-full h-auto object-cover aspect-video" autoPlay  />
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}