

import { fetchArticles, fetchCategories } from '../../lib/fetch';

export default async function GlobalData({ children }) {
  const [articles, categories] = await Promise.all([
    fetchArticles(),
    fetchCategories(),
  ]);

  return children({ articles, categories });
}
