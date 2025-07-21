'use client';
import { FaFacebook, FaTwitter, FaInstagram, FaYoutube, FaTelegram } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';


export default function Footer() {
  const {t} = useTranslation();
    return (
      <footer className="border-t mt-12 py-6 text-sm text-gray-600 bg-gray-50 h-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} The Daily Times. {t('allRightsReserved')}.</p>
          <nav className="flex space-x-4">
            <a href="#" className="hover:underline">{t('about')}</a>
            <ul>
            <a href="#" className="hover:underline">{t('contact')}</a>
            <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className='text-xl text-black-600'><FaFacebook size={24} color="#1877F2"/>FaceBook</a></li>
            <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className='text-xl text-black-800'><FaTwitter size={24} color="#1877F2"/></a>Twitter</li>
            <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className='text-xl text-black-800'><FaInstagram size={24} color="#1877F2"/></a>Instagram</li>
            <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className='text-xl text-black-800'><FaTelegram  size={24} color="#1877F2"/></a>Telegram</li>
            <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className='text-xl text-black-800'><FaFacebook /></a></li>
            </ul>
            <a href="#" className="hover:underline">{t('privacy')}</a>
            <a href="#" className="hover:underline">{t('terms')}</a>
          </nav>
        </div>
      </footer>
    );
  }
  