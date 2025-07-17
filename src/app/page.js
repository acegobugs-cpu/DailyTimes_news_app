import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

const supportedLocales = ['om', 'am', 'en'];

export default  async function Redirect() {
  const headerList = await headers();
  const acceptLanguage = headerList.get('accept-language') || '';

  const preferredLocale = acceptLanguage
    .split(',')[0]
    .split('-')[0]
    .toLowerCase();

  const locale = supportedLocales.includes(preferredLocale)
    ? preferredLocale
    : 'om'; // fallback

  redirect(`/${locale}`);
}
