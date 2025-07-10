'use client';
import MediaRenderer from "./MediaRenderer";

export default function ContentRenderer({ content }) {
  console.log(content);
  if (!content || !Array.isArray(content)) return <p>No content available.</p>;
  
  return (
    <div className="space-y-4">
      {content.map((block) => {
        switch (block.type) {
          case 'header1':
            return (
              <h2 key={block.type} className="text-2xl font-bold text-gray-900">
                {block.content}
              </h2>
            );
          case 'header2':
            return (
              <h3 key={block.type} className="text-xl font-bold text-gray-900">
                {block.content}
              </h3>
            );
          case 'paragraph':
            return (
              <p  key={block.type} className="text-base text-gray-700">
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