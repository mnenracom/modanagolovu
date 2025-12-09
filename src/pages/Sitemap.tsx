import { useEffect } from 'react';
import { productsService } from '@/services/productsService';
import { categoriesService } from '@/services/categoriesService';
import { articlesService } from '@/services/articlesService';
import { generateSitemap, getBaseUrls } from '@/utils/generateSitemap';
import type { SitemapUrl } from '@/utils/generateSitemap';

/**
 * Страница для генерации sitemap.xml
 * Доступна по адресу /sitemap.xml
 */
const Sitemap = () => {
  useEffect(() => {
    const generateDynamicSitemap = async () => {
      try {
        const baseUrls = getBaseUrls();
        const urls: SitemapUrl[] = [...baseUrls];
        const now = new Date().toISOString().split('T')[0];

        // Добавляем категории
        try {
          const categories = await categoriesService.getActive();
          categories.forEach(category => {
            urls.push({
              loc: `/category/${category.slug}`,
              changefreq: 'weekly',
              priority: 0.8,
              lastmod: now,
            });
          });
        } catch (error) {
          console.error('Ошибка загрузки категорий для sitemap:', error);
        }

        // Добавляем товары (только в наличии)
        try {
          const { data: products } = await productsService.getAll({
            in_stock: true,
            limit: 10000, // Большой лимит для всех товаров
          });
          products.forEach(product => {
            urls.push({
              loc: `/product/${product.id}`,
              changefreq: 'weekly',
              priority: 0.7,
              lastmod: now,
            });
          });
        } catch (error) {
          console.error('Ошибка загрузки товаров для sitemap:', error);
        }

        // Добавляем статьи блога (только опубликованные)
        try {
          const articles = await articlesService.getAll({ status: 'published', limit: 1000 });
          articles.forEach(article => {
            urls.push({
              loc: `/blog/${article.slug}`,
              changefreq: 'monthly',
              priority: 0.6,
              lastmod: article.updatedAt || article.createdAt || now,
            });
          });
        } catch (error) {
          console.error('Ошибка загрузки статей для sitemap:', error);
        }

        // Генерируем XML
        const sitemapXml = generateSitemap(urls);

        // Отправляем как XML
        const blob = new Blob([sitemapXml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        window.location.href = url;
      } catch (error) {
        console.error('Ошибка генерации sitemap:', error);
      }
    };

    generateDynamicSitemap();
  }, []);

  return null; // Компонент не рендерит ничего
};

export default Sitemap;

