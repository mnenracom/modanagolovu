import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  siteName?: string;
  locale?: string;
}

export const SEO = ({
  title = 'МОДАНАГОЛОВУ - Оптовый интернет-магазин платков и аксессуаров',
  description = 'Широкий ассортимент платков, косынок, бандан и капоров для вашего бизнеса. Оптовые цены, быстрая доставка.',
  keywords = 'платки оптом, косынки оптом, банданы оптом, капоры оптом, оптовый магазин',
  image,
  url,
  type = 'website',
  siteName = 'МОДАНАГОЛОВУ',
  locale = 'ru_RU',
}: SEOProps) => {
  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  const fullUrl = url ? `${window.location.origin}${url}` : window.location.href;
  const fullImage = image ? (image.startsWith('http') ? image : `${window.location.origin}${image}`) : undefined;

  return (
    <Helmet>
      {/* Основные мета-теги */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      {fullImage && <meta property="og:image" content={fullImage} />}
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {fullImage && <meta name="twitter:image" content={fullImage} />}
      
      {/* Дополнительные мета-теги */}
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={fullUrl} />
    </Helmet>
  );
};




