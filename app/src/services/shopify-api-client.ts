import { shopifyApi, LATEST_API_VERSION, Session, ApiVersion } from '@shopify/shopify-api';

export interface ShopifyApiConfig {
  apiKey: string;
  apiSecretKey: string;
  scopes: string[];
  hostName: string;
  apiVersion?: ApiVersion;
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

export class ShopifyApiClient {
  private shopify: any;
  private retryConfig: RetryConfig;

  constructor(config: ShopifyApiConfig, retryConfig?: Partial<RetryConfig>) {
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      ...retryConfig
    };

    this.shopify = shopifyApi({
      apiKey: config.apiKey,
      apiSecretKey: config.apiSecretKey,
      scopes: config.scopes,
      hostName: config.hostName,
      apiVersion: config.apiVersion || LATEST_API_VERSION,
      isEmbeddedApp: false
    });
  }

  /**
   * Creates a REST client for making API calls
   */
  createRestClient(session: Session): any {
    return new this.shopify.rest.RestClient({ session });
  }

  /**
   * Makes a REST API call with retry logic and error handling
   */
  async makeApiCall<T>(
    apiCall: () => Promise<T>,
    operation: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx)
        if (this.isClientError(error)) {
          throw this.createShopifyApiError(error, operation);
        }

        // Don't retry on the last attempt
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt),
          this.retryConfig.maxDelay
        );

        console.warn(
          `API call failed for ${operation}, attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}. Retrying in ${delay}ms...`,
          error
        );

        await this.sleep(delay);
      }
    }

    throw this.createShopifyApiError(lastError!, operation);
  }

  /**
   * Validates API response and handles common error scenarios
   */
  validateResponse(response: any, operation: string): void {
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
   * Creates a session object for API calls
   */
  createSession(shop: string): Session {
    // Note: accessToken would be used in a real implementation for session creation
    return this.shopify.session.customAppSession(shop);
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
