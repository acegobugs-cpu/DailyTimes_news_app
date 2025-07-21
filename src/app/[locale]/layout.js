export const dynamic = 'force-dynamic';

import { SearchProvider, MainSearchBar} from './components/SearchBar';
import Header from './components/Header';
import CategoryGrid from './components/CategoryGrid';
import Footer from "./components/Footer";
import TranslationProvider from './components/TranslationProvider';
import {fetchCategories} from '../lib/fetch';


export default async function RootLayout({ children, params }) {
  const {locale} = await params || 'om';
  const [categories] = await Promise.all([
    fetchCategories(),
  ]);

  return (
      <TranslationProvider lan={locale}>
      <SearchProvider>
          <Header sections={categories} />
          <main>
            <MainSearchBar />
            {children}
          </main>
          <CategoryGrid categories={categories} />
          <Footer />
      </SearchProvider>
      </TranslationProvider>
  );
}
