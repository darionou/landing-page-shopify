import { ShopifyApiProvider, ShopifyApiConfig } from '../providers/shopify-api-provider';

// Mock Shopify API to avoid initialization issues
jest.mock('@shopify/shopify-api', () => ({
  shopifyApi: jest.fn(() => ({
    clients: { Rest: jest.fn() },
    session: { customAppSession: jest.fn(() => ({ accessToken: null })) }
  })),
  LATEST_API_VERSION: '2023-07'
}));

describe('ShopifyApiProvider', () => {
  const mockConfig: ShopifyApiConfig = {
    apiKey: 'test_api_key',
    apiSecretKey: 'test_api_secret',
    scopes: ['read_customers', 'read_products'],
    hostName: 'test.localhost'
  };

  beforeEach(() => {
    ShopifyApiProvider.reset();

    // Set up test environment variables
    process.env['SHOPIFY_API_KEY'] = 'test_api_key';
    process.env['SHOPIFY_API_SECRET'] = 'test_api_secret';
    process.env['SHOPIFY_SCOPES'] = 'read_customers,read_products';
    process.env['SHOPIFY_APP_URL'] = 'test.localhost';
  });

  afterEach(() => {
    ShopifyApiProvider.reset();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = ShopifyApiProvider.getInstance();
      const instance2 = ShopifyApiProvider.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton instance', () => {
      const instance1 = ShopifyApiProvider.getInstance();

      ShopifyApiProvider.reset();

      const instance2 = ShopifyApiProvider.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('API Client Management', () => {
    let provider: ShopifyApiProvider;

    beforeEach(() => {
      provider = ShopifyApiProvider.getInstance(mockConfig);
    });

    it('should create REST client and session', () => {
      const session = provider.createSession('test-shop.myshopify.com', 'test-token');
      const restClient = provider.createRestClient(session);

      expect(session).toBeDefined();
      expect(restClient).toBeDefined();
    });

    it('should create session with correct shop and token', () => {
      const session = provider.createSession('test-shop.myshopify.com', 'test-token');

      expect(session.accessToken).toBe('test-token');
    });
  });

  describe('Configuration Management', () => {
    it('should throw error for invalid configuration', () => {
      ShopifyApiProvider.reset();
      const invalidConfig = { ...mockConfig, apiKey: '' };

      expect(() => ShopifyApiProvider.getInstance(invalidConfig))
        .toThrow('Invalid Shopify API configuration: missing required fields');
    });

    it('should accept valid configuration without throwing', () => {
      ShopifyApiProvider.reset();

      expect(() => ShopifyApiProvider.getInstance(mockConfig))
        .not.toThrow();
    });
  });

  describe('Environment Configuration Loading', () => {
    it('should load configuration from environment variables', () => {
      process.env['SHOPIFY_API_KEY'] = 'env_key';
      process.env['SHOPIFY_API_SECRET'] = 'env_secret';
      process.env['SHOPIFY_APP_URL'] = 'env.localhost';

      ShopifyApiProvider.reset();

      expect(() => ShopifyApiProvider.getInstance())
        .not.toThrow();
    });

    it('should throw error when required environment variables are missing', () => {
      delete process.env['SHOPIFY_API_KEY'];
      delete process.env['SHOPIFY_API_SECRET'];
      delete process.env['SHOPIFY_APP_URL'];

      ShopifyApiProvider.reset();

      expect(() => ShopifyApiProvider.getInstance())
        .toThrow('Invalid Shopify API configuration: missing required fields');
    });
  });
});