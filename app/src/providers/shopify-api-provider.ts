import { ShopifyApiClient, ShopifyApiConfig, RetryConfig } from '../services/shopify-api-client';

/**
 * Singleton provider for ShopifyApiClient instances
 * Manages configuration and provides a single client instance
 */
export class ShopifyApiProvider {
  private static instance: ShopifyApiProvider;
  private apiConfig: ShopifyApiConfig;

  private constructor(apiConfig: ShopifyApiConfig) {
    this.apiConfig = apiConfig;
  }

  /**
   * Gets the singleton instance of ShopifyApiProvider
   */
  public static getInstance(apiConfig?: ShopifyApiConfig): ShopifyApiProvider {
    if (!ShopifyApiProvider.instance) {
      if (!apiConfig) {
        // Load default configuration from environment variables
        apiConfig = ShopifyApiProvider.loadDefaultConfig();
      }
      ShopifyApiProvider.instance = new ShopifyApiProvider(apiConfig);
    }
    return ShopifyApiProvider.instance;
  }

  /**
   * Creates a new ShopifyApiClient instance
   */
  public getClient(): ShopifyApiClient {
    return new ShopifyApiClient(this.apiConfig);
  }

  /**
   * Creates a new ShopifyApiClient with custom configuration
   */
  public createClient(config: ShopifyApiConfig, retryConfig?: Partial<RetryConfig>): ShopifyApiClient {
    return new ShopifyApiClient(config, retryConfig);
  }

  /**
   * Validates that all required configuration is present
   */
  public validateConfiguration(): boolean {
    return Boolean(
      this.apiConfig.apiKey &&
      this.apiConfig.apiSecretKey &&
      this.apiConfig.scopes &&
      this.apiConfig.scopes.length > 0 &&
      this.apiConfig.hostName
    );
  }

  /**
   * Gets the current API configuration
   */
  public getConfig(): ShopifyApiConfig {
    return { ...this.apiConfig };
  }

  /**
   * Loads default configuration from environment variables
   */
  private static loadDefaultConfig(): ShopifyApiConfig {
    return {
      apiKey: process.env['SHOPIFY_API_KEY'] || '',
      apiSecretKey: process.env['SHOPIFY_API_SECRET'] || '',
      scopes: (process.env['SHOPIFY_SCOPES'] || 'read_customers,read_products').split(','),
      hostName: process.env['SHOPIFY_APP_URL'] || 'localhost:3000'
    };
  }

  /**
   * Resets the singleton instance (useful for testing)
   */
  public static reset(): void {
    ShopifyApiProvider.instance = undefined as any;
  }
}
