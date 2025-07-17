export const dynamic = 'force-dynamic';

import { SearchProvider, MainSearchBar, SearchResults, useSearch  } from './components/SearchBar';
import Header from './components/Header';
import Footer from "./components/Footer";
import TranslationProvider from './components/TranslationProvider';
import { fetchArticles, fetchCategories} from '../lib/fetch';


export default async function RootLayout({ children, params }) {
  const {locale} = await params || 'om';
  const [articles, categories] = await Promise.all([
    fetchArticles(),
    fetchCategories(),
  ]);

  return (
      <TranslationProvider lan={locale}>
      <SearchProvider>
          <Header sections={categories} />
          <main>
            <MainSearchBar />
            <SearchResults articles={articles} />
            {children}
          </main>
          <Footer />
      </SearchProvider>
      </TranslationProvider>
  );
}
