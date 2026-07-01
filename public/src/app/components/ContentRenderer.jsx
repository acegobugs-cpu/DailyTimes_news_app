'use client';
import MediaRenderer from "./MediaRenderer";

export default function ContentRenderer({ content }) {
  if (!content || !Array.isArray(content)) return <p>No content available.</p>;
  
  return (
    <div className="space-y-4">
      {content.map((block) => {
        switch (block.type) {
          case 'header1':
            return (
              <h2 key={block.id} className="text-2xl font-bold text-gray-900">
                {block.text}
              </h2>
            );
          case 'header2':
            return (
              <h3 key={block.id} className="text-xl font-bold text-gray-900">
                {block.text}
              </h3>
            );
          case 'paragraph':
            return (
              <p  key={block.id} className="text-base text-gray-700">
              {block.text}
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