// Типы для работы со статьями блога в Supabase

export interface ArticleCategorySupabase {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
}

export interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ArticleSupabase {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  category_id: number | null;
  author_id: string | null;
  author_name: string | null;
  
  // SEO
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_image_url: string | null;
  og_title: string | null;
  og_description: string | null;
  
  // Статус
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  is_featured: boolean;
  views_count: number;
  
  // Дополнительно
  allow_comments: boolean;
  tags: string[] | null;
  
  created_at: string;
  updated_at: string | null;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImageUrl?: string;
  categoryId?: string;
  category?: ArticleCategory;
  authorId?: string;
  authorName?: string;
  
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogImageUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  
  // Статус
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  isFeatured: boolean;
  viewsCount: number;
  
  // Дополнительно
  allowComments: boolean;
  tags: string[];
  
  createdAt: string;
  updatedAt?: string;
}

export interface ArticleFormData {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImageUrl?: string;
  categoryId?: number | null;
  authorName?: string;
  
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogImageUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  
  // Статус
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  isFeatured?: boolean;
  allowComments?: boolean;
  tags?: string[];
}

// Функция для преобразования Supabase формата в клиентский
export const transformArticleCategoryFromSupabase = (category: ArticleCategorySupabase): ArticleCategory => {
  return {
    id: category.id.toString(),
    name: category.name,
    slug: category.slug,
    description: category.description || undefined,
    imageUrl: category.image_url || undefined,
    isActive: category.is_active,
    sortOrder: category.sort_order,
    createdAt: category.created_at,
    updatedAt: category.updated_at || undefined,
  };
};

export const transformArticleFromSupabase = (article: ArticleSupabase, category?: ArticleCategory): Article => {
  return {
    id: article.id.toString(),
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt || undefined,
    content: article.content,
    featuredImageUrl: article.featured_image_url || undefined,
    categoryId: article.category_id?.toString(),
    category: category,
    authorId: article.author_id || undefined,
    authorName: article.author_name || undefined,
    
    // SEO
    metaTitle: article.meta_title || undefined,
    metaDescription: article.meta_description || undefined,
    metaKeywords: article.meta_keywords || undefined,
    ogImageUrl: article.og_image_url || undefined,
    ogTitle: article.og_title || undefined,
    ogDescription: article.og_description || undefined,
    
    // Статус
    status: article.status,
    publishedAt: article.published_at || undefined,
    isFeatured: article.is_featured,
    viewsCount: article.views_count,
    
    // Дополнительно
    allowComments: article.allow_comments,
    tags: article.tags || [],
    
    createdAt: article.created_at,
    updatedAt: article.updated_at || undefined,
  };
};

// Функция для преобразования клиентского формата в Supabase
export const transformArticleToSupabase = (article: Partial<ArticleFormData>, authorId?: string): Partial<ArticleSupabase> => {
  const data: any = {};
  
  if (article.title !== undefined) data.title = article.title;
  if (article.slug !== undefined) data.slug = article.slug;
  if (article.excerpt !== undefined) data.excerpt = article.excerpt || null;
  if (article.content !== undefined) data.content = article.content;
  if (article.featuredImageUrl !== undefined) data.featured_image_url = article.featuredImageUrl || null;
  if (article.categoryId !== undefined) data.category_id = article.categoryId || null;
  if (authorId !== undefined) data.author_id = authorId || null;
  if (article.authorName !== undefined) data.author_name = article.authorName || null;
  
  // SEO
  if (article.metaTitle !== undefined) data.meta_title = article.metaTitle || null;
  if (article.metaDescription !== undefined) data.meta_description = article.metaDescription || null;
  if (article.metaKeywords !== undefined) data.meta_keywords = article.metaKeywords || null;
  if (article.ogImageUrl !== undefined) data.og_image_url = article.ogImageUrl || null;
  if (article.ogTitle !== undefined) data.og_title = article.ogTitle || null;
  if (article.ogDescription !== undefined) data.og_description = article.ogDescription || null;
  
  // Статус
  if (article.status !== undefined) data.status = article.status;
  if (article.publishedAt !== undefined) {
    data.published_at = article.publishedAt ? new Date(article.publishedAt).toISOString() : null;
  }
  if (article.isFeatured !== undefined) data.is_featured = article.isFeatured;
  if (article.allowComments !== undefined) data.allow_comments = article.allowComments;
  if (article.tags !== undefined) data.tags = article.tags || null;
  
  return data;
};




