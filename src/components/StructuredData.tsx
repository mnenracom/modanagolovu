import { Helmet } from 'react-helmet-async';

interface StructuredDataProps {
  type: 'Organization' | 'WebSite' | 'Product' | 'BreadcrumbList' | 'Article';
  data: any;
}

/**
 * Компонент для добавления структурированных данных (JSON-LD)
 * Помогает поисковым системам лучше понимать контент сайта
 */
export const StructuredData = ({ type, data }: StructuredDataProps) => {
  const getStructuredData = () => {
    const baseUrl = 'https://modanagolovu.ru';
    
    switch (type) {
      case 'Organization':
        return {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'МОДАНАГОЛОВУ',
          url: baseUrl,
          logo: `${baseUrl}/logo.png`,
          description: 'Оптовый интернет-магазин платков, косынок, бандан и капоров',
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'RU',
            addressLocality: 'Россия',
          },
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            availableLanguage: 'Russian',
          },
          sameAs: data.socialLinks || [],
        };
      
      case 'WebSite':
        return {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'МОДАНАГОЛОВУ',
          url: baseUrl,
          description: 'Оптовый интернет-магазин платков, косынок, бандан и капоров',
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${baseUrl}/catalog?search={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
          },
        };
      
      case 'Product':
        return {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: data.name,
          description: data.description,
          image: data.images || [data.image],
          brand: {
            '@type': 'Brand',
            name: 'МОДАНАГОЛОВУ',
          },
          offers: {
            '@type': 'Offer',
            price: data.price || data.retailPrice,
            priceCurrency: 'RUB',
            availability: data.inStock 
              ? 'https://schema.org/InStock' 
              : 'https://schema.org/OutOfStock',
            url: `${baseUrl}/product/${data.id}`,
          },
          aggregateRating: data.rating ? {
            '@type': 'AggregateRating',
            ratingValue: data.rating,
            reviewCount: data.reviewCount || 0,
          } : undefined,
        };
      
      case 'BreadcrumbList':
        return {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: data.items.map((item: any, index: number) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: `${baseUrl}${item.url}`,
          })),
        };
      
      case 'Article':
        return {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: data.title,
          description: data.description || data.excerpt,
          image: data.image,
          datePublished: data.publishedAt,
          dateModified: data.updatedAt,
          author: {
            '@type': 'Organization',
            name: 'МОДАНАГОЛОВУ',
          },
          publisher: {
            '@type': 'Organization',
            name: 'МОДАНАГОЛОВУ',
            logo: {
              '@type': 'ImageObject',
              url: `${baseUrl}/logo.png`,
            },
          },
        };
      
      default:
        return null;
    }
  };

  const structuredData = getStructuredData();
  
  if (!structuredData) return null;

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

