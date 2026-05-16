'use client';
import { useTranslation } from 'react-i18next';

export default function MoreStories({stories}) {
  const {t} = useTranslation();
  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <h3 className="text-xl font-bold mb-4 border-b pb-2">{t('more')}</h3>
      <div className="grid md:grid-cols-3 gap-6">
        {stories.map((story, index) => (
          <div key={index} className="border-t pt-4">
            <h4 className="font-semibold text-lg">{story.translations[0].title}</h4>
            <p className="text-sm text-gray-600 mt-1">{story.translations[0].description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
  