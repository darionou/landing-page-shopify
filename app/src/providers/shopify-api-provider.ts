import { RetryConfig, ShopifyApiConfig } from '../types/shopify';
import { ShopifyApiError } from '../errors/ServerError';
import { shopifyApi, LATEST_API_VERSION, Session, ShopifyRestResources } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';
import dotenv from 'dotenv';
import { loadConfig, validateConfiguration } from '../utils/shopify';

dotenv.config();

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

    const validationResult = validateConfiguration(apiConfig);
    if (!validationResult.isValid) {
      throw this._createValidationError(validationResult.missingFields);
    }

    this.shopify = shopifyApi({
      apiKey: apiConfig.apiKey,
      apiSecretKey: apiConfig.apiSecretKey,
      scopes: apiConfig.scopes,
      hostName: apiConfig.hostName,
      apiVersion: LATEST_API_VERSION,
      isEmbeddedApp: false
    });
  }

  /**
   * Gets the singleton instance of ShopifyApiProvider
   */
  public static getInstance(apiConfig?: ShopifyApiConfig, retryConfig?: Partial<RetryConfig>): ShopifyApiProvider {
    if (!ShopifyApiProvider.instance) {
      if (!apiConfig) {
        apiConfig = loadConfig();
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
    const client = this.createRestClient(session);

    return this.makeApiCall(async () => {
      let response;

      switch (method) {
        case 'GET':
          response = await client.get({ path });
          break;
        case 'POST':
          response = await client.post({ path, data });
          break;
        case 'PUT':
          response = await client.put({ path, data });
          break;
        case 'DELETE':
          response = await client.delete({ path });
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
          this._validateResponse(result, operation);
        }
        return result;
      } catch (error) {
        lastError = error as Error;

        if (this.isClientError(error)) {
          throw this._createErrorFromException(error, operation);
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

    throw this._createErrorFromException(lastError!, operation);
  }

  /**
   * Validates API response and handles common error scenarios
   */
  private _validateResponse(response: any, operation: string): void {
    // Check for no response or Shopify API errors in response
    if (!response || response.errors) {
      throw this._createResponseError(operation, response);
    }
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

  private _createValidationError(missingFields: string[]): ShopifyApiError {
    const message = `Invalid Shopify API configuration: missing required fields: ${missingFields.join(', ')}`;
    return new ShopifyApiError(message);
  }

  private _createResponseError(operation: string, response?: any): ShopifyApiError {
    if (!response) {
      return new ShopifyApiError(`No response received for ${operation}`);
    }

    const errorMessage = Array.isArray(response.errors)
      ? response.errors.join(', ')
      : String(response.errors);

    const message = `Shopify API error for ${operation}: ${errorMessage}`;
    return new ShopifyApiError(message);
  }

  private _createErrorFromException(error: any, operation: string): ShopifyApiError {
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
