import { ShopifyApiClient, ShopifyApiError, ShopifyApiConfig } from '../services/shopify-api-client';

// Mock the Shopify API
jest.mock('@shopify/shopify-api', () => ({
  shopifyApi: jest.fn(() => ({
    rest: {
      RestClient: jest.fn()
    },
    session: {
      customAppSession: jest.fn(() => ({ shop: 'test-shop' }))
    }
  })),
  LATEST_API_VERSION: '2023-10'
}));

describe('ShopifyApiClient', () => {
  let client: ShopifyApiClient;
  let mockConfig: ShopifyApiConfig;

  beforeEach(() => {
    mockConfig = {
      apiKey: 'test-api-key',
      apiSecretKey: 'test-secret',
      scopes: ['read_customers', 'read_products'],
      hostName: 'test-host.com'
    };
    client = new ShopifyApiClient(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with default retry config', () => {
      expect(client).toBeInstanceOf(ShopifyApiClient);
    });

    it('should accept custom retry config', () => {
      const customRetryConfig = { maxRetries: 5, baseDelay: 2000, maxDelay: 20000 };
      const customClient = new ShopifyApiClient(mockConfig, customRetryConfig);
      expect(customClient).toBeInstanceOf(ShopifyApiClient);
    });
  });

  describe('makeApiCall', () => {
    it('should return result on successful API call', async () => {
      const mockApiCall = jest.fn().mockResolvedValue({ data: 'success' });

      const result = await client.makeApiCall(mockApiCall, 'test operation');

      expect(result).toEqual({ data: 'success' });
      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    it('should retry on server errors', async () => {
      const serverError = new Error('Server error');
      (serverError as any).response = { status: 500 };

      const mockApiCall = jest.fn()
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue({ data: 'success' });

      // Create client with shorter delays for testing
      const fastClient = new ShopifyApiClient(mockConfig, {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100
      });

      const result = await fastClient.makeApiCall(mockApiCall, 'test operation');

      expect(result).toEqual({ data: 'success' });
      expect(mockApiCall).toHaveBeenCalledTimes(3);
    });

    it('should not retry on client errors', async () => {
      const clientError = new Error('Client error');
      (clientError as any).response = { status: 400 };

      const mockApiCall = jest.fn().mockRejectedValue(clientError);

      await expect(client.makeApiCall(mockApiCall, 'test operation'))
        .rejects.toThrow(ShopifyApiError);

      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    it('should throw ShopifyApiError after max retries', async () => {
      const serverError = new Error('Server error');
      (serverError as any).response = { status: 500 };

      const mockApiCall = jest.fn().mockRejectedValue(serverError);

      // Create client with shorter delays for testing
      const fastClient = new ShopifyApiClient(mockConfig, {
        maxRetries: 2,
        baseDelay: 10,
        maxDelay: 100
      });

      await expect(fastClient.makeApiCall(mockApiCall, 'test operation'))
        .rejects.toThrow(ShopifyApiError);

      expect(mockApiCall).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    }, 10000);
  });

  describe('validateResponse', () => {
    it('should not throw for valid response', () => {
      const validResponse = { data: 'test' };

      expect(() => client.validateResponse(validResponse, 'test operation'))
        .not.toThrow();
    });

    it('should throw for null response', () => {
      expect(() => client.validateResponse(null, 'test operation'))
        .toThrow(ShopifyApiError);
    });

    it('should throw for response with errors array', () => {
      const errorResponse = { errors: ['Error 1', 'Error 2'] };

      expect(() => client.validateResponse(errorResponse, 'test operation'))
        .toThrow(ShopifyApiError);
    });

    it('should throw for response with error string', () => {
      const errorResponse = { errors: 'Single error' };

      expect(() => client.validateResponse(errorResponse, 'test operation'))
        .toThrow(ShopifyApiError);
    });
  });

  describe('createSession', () => {
    it('should create a session with shop', () => {
      const session = client.createSession('test-shop.myshopify.com');

      expect(session).toEqual({ shop: 'test-shop' });
    });
  });

  describe('ShopifyApiError', () => {
    it('should create error with message, status code, and response', () => {
      const error = new ShopifyApiError('Test error', 400, { error: 'Bad request' });

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.response).toEqual({ error: 'Bad request' });
      expect(error.name).toBe('ShopifyApiError');
    });
  });
});
