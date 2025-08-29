// Simple types for personalized landing page

export interface UserProfile {
  user_id: string;
  first_name: string;
  profile_image_url?: string;
  assigned_product?: AssignedProduct;
}

export interface AssignedProduct {
  id: number;
  title: string;
  image_url: string;
  price: string;
  handle: string;
}

export interface ProxyResponse {
  success: boolean;
  data?: UserProfile;
  error?: string;
}

// Shopify API types (minimal)
export interface ShopifyCustomer {
  id: number;
  first_name: string;
  email: string;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  variants: { price: string }[];
  images: { src: string }[];
}

export interface ShopifyMetafield {
  id: number;
  namespace: string;
  key: string;
  value: string;
}

// Simple validation
export const validateUserId = (userId: any): boolean => {
  return typeof userId === 'string' && userId.trim().length > 0 && !isNaN(Number(userId));
};
