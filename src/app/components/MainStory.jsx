
import { PrimaryStories } from "./PrimaryStories";
import { SecondaryStories } from "./SecondaryStories";

export default function MainStory({ searchTerm }) {
    return (
      <section className="max-w-7xl mx-auto md:px-4 py-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <PrimaryStories/>
        <SecondaryStories/>
      </section>
    );
  }
  