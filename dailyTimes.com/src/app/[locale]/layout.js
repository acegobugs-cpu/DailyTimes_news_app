export const dynamic = 'force-dynamic';

import Header from '../components/Header';
import CategoryGrid from '../components/CategoryGrid';
import Footer from "../components/Footer";
import TranslationProvider from '../components/TranslationProvider';
import {fetchCategories} from '../lib/fetch';
import { notFound } from 'next/navigation';

export default async function RootLayout({ children}) {    
    const [categories] = await Promise.all([
        fetchCategories(),
    ]);
    return (
        <TranslationProvider>
            <Header sections={categories} />
            <main>
                {children}
            </main>
            <CategoryGrid categories={categories} />
            <Footer />
        </TranslationProvider>
    );
}
