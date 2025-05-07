export default function MainStory() {
    return (
      <section className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-6">
        <img
          src="/main-story.jpg"
          alt="Main headline image"
          className="w-full h-auto object-cover rounded"
        />
        <div className="flex flex-col justify-center">
          <p className="text-sm text-gray-500">World News</p>
          <h2 className="text-3xl font-serif font-bold mb-4">
            Addis Ababa new promise. city of shit
          </h2>
          <p className="text-gray-700 text-base">
            Leaders from across the globe gather to negotiate peace agreements in a historic summit aimed at ending years of conflict and rebuilding trust between nations.
          </p>
        </div>
      </section>
    );
  }
  