// Service layer exports
export { ShopifyApiClient, ShopifyApiError } from './shopify-api-client';
export { CustomerService } from './customer-service';
export { ProductService } from './product-service';

export type { ShopifyApiConfig, RetryConfig } from './shopify-api-client';
export type { CustomerData, CustomerMetafields } from './customer-service';
export type { ProductData } from './product-service';
