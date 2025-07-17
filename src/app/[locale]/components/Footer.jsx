'use client';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const {t} = useTranslation();
    return (
      <footer className="border-t mt-12 py-6 text-sm text-gray-600 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} The Daily Times. {t('allRightsReserved')}.</p>
          <nav className="flex space-x-4">
            <a href="#" className="hover:underline">{t('about')}</a>
            <a href="#" className="hover:underline">{t('contact')}</a>
            <a href="#" className="hover:underline">{t('privacy')}</a>
            <a href="#" className="hover:underline">{t('terms')}</a>
          </nav>
        </div>
      </footer>
    );
  }
  