import { ApiVersion } from '@shopify/shopify-api';


export interface ShopifyApiConfig {
    apiKey: string;
    apiSecretKey: string;
    scopes: string[];
    hostName: string;
    apiVersion?: ApiVersion;
    accessToken?: string;
    shop?: string;
  }

export interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  }
