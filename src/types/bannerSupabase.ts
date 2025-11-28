export interface BannerSupabase {
  id: number;
  title?: string | null;
  subtitle?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  image_url: string;
  mobile_image_url?: string | null;
  order_index?: number | null;
  is_active?: boolean | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface Banner {
  id: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  orderIndex: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const transformBannerFromSupabase = (banner: BannerSupabase): Banner => {
  return {
    id: banner.id.toString(),
    title: banner.title || undefined,
    subtitle: banner.subtitle || undefined,
    buttonText: banner.button_text || undefined,
    buttonLink: banner.button_link || undefined,
    imageUrl: banner.image_url,
    mobileImageUrl: banner.mobile_image_url || undefined,
    orderIndex: banner.order_index ?? 0,
    isActive: banner.is_active ?? true,
    createdAt: banner.created_at,
    updatedAt: banner.updated_at || undefined,
  };
};

export const transformBannerToSupabase = (banner: Partial<Banner>): Partial<BannerSupabase> => {
  return {
    title: banner.title || null,
    subtitle: banner.subtitle || null,
    button_text: banner.buttonText || null,
    button_link: banner.buttonLink || null,
    image_url: banner.imageUrl || '',
    mobile_image_url: banner.mobileImageUrl || null,
    order_index: banner.orderIndex ?? 0,
    is_active: banner.isActive ?? true,
  };
};





