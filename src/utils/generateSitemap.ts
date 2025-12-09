/**
 * Утилита для генерации sitemap.xml
 * Можно использовать для динамической генерации или создания статического файла
 */

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export const generateSitemap = (urls: SitemapUrl[]): string => {
  const baseUrl = 'https://modanagolovu.ru';
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.map(url => `  <url>
    <loc>${baseUrl}${url.loc}</loc>
    ${url.lastmod ? `    <lastmod>${url.lastmod}</lastmod>` : ''}
    ${url.changefreq ? `    <changefreq>${url.changefreq}</changefreq>` : ''}
    ${url.priority !== undefined ? `    <priority>${url.priority}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`;

  return sitemap;
};

/**
 * Базовые URL для сайта
 */
export const getBaseUrls = (): SitemapUrl[] => {
  const now = new Date().toISOString().split('T')[0];
  
  return [
    { loc: '/', changefreq: 'daily', priority: 1.0, lastmod: now },
    { loc: '/catalog', changefreq: 'daily', priority: 0.9, lastmod: now },
    { loc: '/blog', changefreq: 'weekly', priority: 0.8, lastmod: now },
    { loc: '/about', changefreq: 'monthly', priority: 0.7, lastmod: now },
    { loc: '/contacts', changefreq: 'monthly', priority: 0.7, lastmod: now },
    { loc: '/cart', changefreq: 'never', priority: 0.3 },
    { loc: '/account', changefreq: 'never', priority: 0.3 },
  ];
};

