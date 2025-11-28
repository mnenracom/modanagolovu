export interface Review {
  id: number;
  productId: number;
  source: 'website' | 'wildberries' | 'ozon';
  marketplaceType?: 'wildberries' | 'ozon';
  externalReviewId?: string;
  authorName: string;
  authorEmail?: string;
  authorAvatarUrl?: string;
  rating: number; // 1-5
  title?: string;
  text: string;
  pros?: string;
  cons?: string;
  photos?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  moderationNotes?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  replyText?: string;
  replyDate?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  externalCreatedAt?: string;
}

export interface ReviewFormData {
  productId: number;
  rating: number;
  title?: string;
  text: string;
  pros?: string;
  cons?: string;
  photos?: string[];
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  };
}




