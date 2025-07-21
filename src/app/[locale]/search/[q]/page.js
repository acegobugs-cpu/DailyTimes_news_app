import { fetchSearch } from '../../../lib/fetch';

export default async function SearchResults({params}) {
    const {q} = await params;
    try {
        const articles = await fetchSearch(q);

        if (!articles) {
            return (
            <main className="max-w-7xl mx-auto px-4 py-8">
                <p className="text-center text-gray-700">Article not found.</p>
            </main>
            );
        }

        return (
            <div className="max-w-7xl mx-auto px-4 py-4">
            {articles.length > 0 ? (
                <ul className="space-y-4">
                {articles.map((article) => (
                    <li key={article.id} className="border-b border-gray-200 pb-2">
                    <h3 className="text-lg font-semibold">{article.translations[0].title}</h3>
                    <p className="text-gray-600">{article.translations[0].description}</p>
                    </li>
                ))}
                </ul>
            ) : (
                <p className="text-gray-500">No results found for "{q}"</p>
            )}
            </div>
        );
    } catch (error) {
        console.error('Failed to fetch article:', error);
        return (
        <main className="max-w-7xl mx-auto px-4 py-8">
            <p className="text-center text-gray-700">Failed to load article. Please try again later.</p>
        </main>
        );
  }
}