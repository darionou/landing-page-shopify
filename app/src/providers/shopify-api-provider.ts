import { shopifyApi, LATEST_API_VERSION, Session, ApiVersion, ShopifyRestResources } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

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

export class ShopifyApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ShopifyApiError';
  }
}

/**
 * Singleton provider for Shopify API functionality
 * Manages configuration, sessions, and API calls
 */
export class ShopifyApiProvider {
  private static instance: ShopifyApiProvider;
  private apiConfig: ShopifyApiConfig;
  private shopify: ShopifyRestResources;
  private retryConfig: RetryConfig;

  private constructor(apiConfig: ShopifyApiConfig, retryConfig?: Partial<RetryConfig>) {
    this.apiConfig = apiConfig;
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      ...retryConfig
    };

    const validationResult = this.validateConfiguration();
    if (!validationResult.isValid) {
      throw new ShopifyApiError(`Invalid Shopify API configuration: missing required fields: ${validationResult.missingFields.join(', ')}`);
    }

    this.shopify = shopifyApi({
      apiKey: apiConfig.apiKey,
      apiSecretKey: apiConfig.apiSecretKey,
      scopes: apiConfig.scopes,
      hostName: apiConfig.hostName,
      apiVersion: apiConfig.apiVersion || LATEST_API_VERSION,
      isEmbeddedApp: false
    });
  }

  /**
   * Gets the singleton instance of ShopifyApiProvider
   */
  public static getInstance(apiConfig?: ShopifyApiConfig, retryConfig?: Partial<RetryConfig>): ShopifyApiProvider {
    if (!ShopifyApiProvider.instance) {
      if (!apiConfig) {
        apiConfig = ShopifyApiProvider.loadConfig();
      }
      ShopifyApiProvider.instance = new ShopifyApiProvider(apiConfig, retryConfig);
    }
    return ShopifyApiProvider.instance;
  }

  /**
   * Creates a REST client for making API calls
   */
  public createRestClient(session: Session): any {
    return new this.shopify['clients'].Rest({ session });
  }

  /**
   * Creates a GraphQL client for making API calls
   */
  public createGraphQLClient(session: Session): any {
    return new this.shopify['clients'].Graphql({ session });
  }

  /**
   * Makes a GraphQL query with retry logic and error handling
   */
  public async makeGraphQLCall(
    session: Session,
    query: string,
    variables?: any,
    operation?: string
  ): Promise<any> {
    const client = this.createGraphQLClient(session);

    return this.makeApiCall(async () => {
      const response = await client.request(query, {
        variables
      });
      return response.data;
    }, operation || 'GraphQL query');
  }

  /**
   * Makes a REST API call with retry logic and error handling
   */
  public async makeRestCall(
    session: Session,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: any,
    operation?: string
  ): Promise<any> {
    const restClient = this.createRestClient(session);

    return this.makeApiCall(async () => {
      let response;

      switch (method) {
        case 'GET':
          response = await restClient.get({ path });
          break;
        case 'POST':
          response = await restClient.post({ path, data });
          break;
        case 'PUT':
          response = await restClient.put({ path, data });
          break;
        case 'DELETE':
          response = await restClient.delete({ path });
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      return response.body;
    }, operation || 'REST API call');
  }

  /**
   * Creates a session object for API calls
   */
  public createSession(shop?: string, accessToken?: string): Session {
    const sessionShop = shop || this.apiConfig.shop;
    const sessionToken = accessToken || this.apiConfig.accessToken;

    const session = this.shopify['session'].customAppSession(sessionShop);
    session.accessToken = sessionToken;
    return session;
  }

  /**
   * Validates that all required configuration is present
   */
  private validateConfiguration(): { isValid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    if (!this.apiConfig.apiKey) {
      missingFields.push('apiKey (SHOPIFY_API_KEY)');
    }

    if (!this.apiConfig.apiSecretKey) {
      missingFields.push('apiSecretKey (SHOPIFY_API_SECRET)');
    }

    if (!this.apiConfig.scopes || this.apiConfig.scopes.length === 0) {
      missingFields.push('scopes (SHOPIFY_SCOPES)');
    }

    if (!this.apiConfig.hostName) {
      missingFields.push('hostName (SHOPIFY_APP_URL)');
    }

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Makes a REST API call with retry logic and error handling
   */
  private async makeApiCall<T>(
    apiCall: () => Promise<T>,
    operation: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await apiCall();
        if (result && typeof result === 'object' && 'body' in result) {
          this.validateResponse(result, operation);
        }
        return result;
      } catch (error) {
        lastError = error as Error;

        if (this.isClientError(error)) {
          throw this.createShopifyApiError(error, operation);
        }

        if (attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt),
          this.retryConfig.maxDelay
        );

        await this.sleep(delay);
      }
    }

    throw this.createShopifyApiError(lastError!, operation);
  }

  /**
   * Validates API response and handles common error scenarios
   */
  private validateResponse(response: any, operation: string): void {
    if (!response) {
      throw new ShopifyApiError(`No response received for ${operation}`);
    }

    // Check for Shopify API errors in response
    if (response.errors) {
      const errorMessage = Array.isArray(response.errors)
        ? response.errors.join(', ')
        : response.errors;
      throw new ShopifyApiError(`Shopify API error for ${operation}: ${errorMessage}`);
    }
  }


  /**
   * Loads default configuration from environment variables
   */
  private static loadConfig(): ShopifyApiConfig {
    const config = {
      apiKey: process.env['SHOPIFY_API_KEY'] || '',
      apiSecretKey: process.env['SHOPIFY_API_SECRET'] || '',
      scopes: (process.env['SHOPIFY_SCOPES'] || 'read_customers,read_products').split(','),
      hostName: process.env['SHOPIFY_APP_URL'] || 'localhost:3000',
      accessToken: process.env['SHOPIFY_ACCESS_TOKEN'] || '',
      shop: process.env['SHOPIFY_SHOP'] || ''
    };
    return config;
  }

  /**
   * Resets the singleton instance (useful for testing)
   */
  public static reset(): void {
    ShopifyApiProvider.instance = undefined as any;
  }

  private isClientError(error: any): boolean {
    return error?.response?.status >= 400 && error?.response?.status < 500;
  }

  private createShopifyApiError(error: any, operation: string): ShopifyApiError {
    const statusCode = error?.response?.status;
    const message = error?.message || 'Unknown API error';
    const response = error?.response?.data;

    return new ShopifyApiError(
      `${operation} failed: ${message}`,
      statusCode,
      response
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
