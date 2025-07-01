'use client';
import { useParams } from 'next/navigation';
import { articles } from '../../data/articles';
import ContentRenderer from '../../components/ContentRenderer';
import Image from 'next/image';

export default function ArticlePage() {
  const { AID } = useParams();
  const article = articles.find((a) => a.AID === Number(AID));

  if (!article) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-center text-gray-700">Article not found.</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <article>
        <h1 className="text-2xl md:text-4xl font-serif font-bold text-[#211C84] mb-4">
          {article.title}
        </h1>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <p className="text-sm text-gray-500">
              {Array.isArray(article.category) && article.category.length > 0
                ? article.category.join(', ')
                : 'Uncategorized'}
            </p>
            <p className="text-sm text-gray-500">By {article.author} | {article.date}</p>
          </div>
          {article.image && (
            <Image
              src={article.image}
              alt={`${article.title} main image`}
              width={800}
              height={450}
              className="w-full md:w-1/2 h-auto rounded"
            />
          )}
        </div>
        <p className="text-base text-gray-700 mb-6">{article.description}</p>
        <ContentRenderer content={article.content} />
      </article>
    </main>
  );
}