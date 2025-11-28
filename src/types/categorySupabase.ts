// Типы для работы с категориями в Supabase

export interface CategorySupabase {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  description: string | null;
  image: string | null;
  order_index: number;
  is_active: boolean;
  show_on_homepage: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  description?: string;
  image?: string;
  orderIndex: number;
  isActive: boolean;
  showOnHomepage?: boolean;
}

export interface CategoryFormData {
  name: string;
  slug: string;
  parent_id?: number | null;
  description?: string;
  image?: string;
  order_index?: number;
  is_active?: boolean;
  show_on_homepage?: boolean;
}

// Функция для преобразования Supabase формата в клиентский
export const transformCategoryFromSupabase = (category: CategorySupabase): Category => {
  return {
    id: category.id.toString(),
    name: category.name,
    slug: category.slug,
    parentId: category.parent_id?.toString(),
    description: category.description || undefined,
    image: category.image || undefined,
    orderIndex: category.order_index,
    isActive: category.is_active,
    showOnHomepage: (category as any).show_on_homepage || false,
  };
};

// Функция для преобразования клиентского формата в Supabase
export const transformCategoryToSupabase = (category: Partial<CategoryFormData>): Partial<CategorySupabase> => {
  const data: any = {};
  
  if (category.name !== undefined) data.name = category.name;
  if (category.slug !== undefined) data.slug = category.slug;
  if (category.parent_id !== undefined) data.parent_id = category.parent_id;
  if (category.description !== undefined) data.description = category.description || null;
  if (category.image !== undefined) data.image = category.image || null;
  if (category.order_index !== undefined) data.order_index = category.order_index;
  if (category.is_active !== undefined) data.is_active = category.is_active;
  
  return data;
};






