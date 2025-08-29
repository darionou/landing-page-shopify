import { ShopifyApiConfig } from '../types/shopify';

export const validateConfiguration = (apiConfig: ShopifyApiConfig): { isValid: boolean; missingFields: string[] } => {
  const missingFields: string[] = [];

  if (!apiConfig.apiKey) {
    missingFields.push('apiKey (SHOPIFY_API_KEY)');
  }

  if (!apiConfig.apiSecretKey) {
    missingFields.push('apiSecretKey (SHOPIFY_API_SECRET)');
  }

  if (!apiConfig.scopes || apiConfig.scopes.length === 0) {
    missingFields.push('scopes (SHOPIFY_SCOPES)');
  }

  if (!apiConfig.hostName) {
    missingFields.push('hostName (SHOPIFY_APP_URL)');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

export const loadConfig = (): ShopifyApiConfig => {
  const config = {
    apiKey: process.env['SHOPIFY_API_KEY'] || '',
    apiSecretKey: process.env['SHOPIFY_API_SECRET'] || '',
    scopes: (process.env['SHOPIFY_SCOPES'] || 'read_customers,read_products').split(','),
    hostName: process.env['SHOPIFY_APP_URL'] || 'localhost:3000',
    accessToken: process.env['SHOPIFY_ACCESS_TOKEN'] || '',
    shop: process.env['SHOPIFY_SHOP'] || ''
  };
  return config;
};
