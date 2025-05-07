const stories = [
    {
      title: "Tech Giants Face New EU Regulations",
      summary: "The European Union unveils stricter digital laws targeting monopoly behavior.",
    },
    {
      title: "NASA Plans New Moon Mission",
      summary: "The Artemis program aims to send humans back to the Moon by 2026.",
    },
    {
      title: "Climate Talks Stall at Summit",
      summary: "Disagreements over emission cuts cause delays in international climate agreements.",
    },
  ];
  
  export default function SecondaryStories() {
    return (
      <section className="max-w-7xl mx-auto px-4 py-6">
        <h3 className="text-xl font-bold mb-4 border-b pb-2">More Stories</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {stories.map((story, index) => (
            <div key={index} className="border-t pt-4">
              <h4 className="font-semibold text-lg">{story.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{story.summary}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }
  