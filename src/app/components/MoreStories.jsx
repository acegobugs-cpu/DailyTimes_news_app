'use client';
export default function MoreStories({stories}) {
  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <h3 className="text-xl font-bold mb-4 border-b pb-2">More Stories</h3>
      <div className="grid md:grid-cols-3 gap-6">
        {stories.map((story, index) => (
          <div key={index} className="border-t pt-4">
            <h4 className="font-semibold text-lg">{story.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{story.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
  