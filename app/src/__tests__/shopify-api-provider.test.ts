import { ShopifyApiProvider } from '../providers/shopify-api-provider';
import { ShopifyApiClient } from '../services/shopify-api-client';

// Mock ShopifyApiClient to avoid Shopify API initialization issues
jest.mock('../services/shopify-api-client');

describe('ShopifyApiProvider', () => {
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

  describe('Client Management', () => {
    let provider: ShopifyApiProvider;

    beforeEach(() => {
      provider = ShopifyApiProvider.getInstance();
    });

    it('should create and return ShopifyApiClient', () => {
      const client = provider.getClient();
      expect(client).toBeInstanceOf(ShopifyApiClient);
    });

    it('should create new client instances on each call', () => {
      const client1 = provider.getClient();
      const client2 = provider.getClient();

      expect(client1).not.toBe(client2);
    });

    it('should create custom client with provided config', () => {
      const customConfig = {
        apiKey: 'custom_key',
        apiSecretKey: 'custom_secret',
        scopes: ['read_products'],
        hostName: 'custom.localhost'
      };

      const client = provider.createClient(customConfig);
      expect(client).toBeInstanceOf(ShopifyApiClient);
    });
  });

  describe('Configuration Management', () => {
    let provider: ShopifyApiProvider;

    beforeEach(() => {
      provider = ShopifyApiProvider.getInstance();
    });

    it('should validate configuration', () => {
      const isValid = provider.validateConfiguration();
      expect(isValid).toBe(true);
    });

    it('should return false for invalid configuration', () => {
      delete process.env['SHOPIFY_API_KEY'];

      ShopifyApiProvider.reset();
      const newProvider = ShopifyApiProvider.getInstance();

      const isValid = newProvider.validateConfiguration();
      expect(isValid).toBe(false);
    });

    it('should get current configuration', () => {
      const config = provider.getConfig();

      expect(config).toHaveProperty('apiKey');
      expect(config).toHaveProperty('apiSecretKey');
      expect(config).toHaveProperty('scopes');
      expect(config).toHaveProperty('hostName');
    });
  });

  describe('Custom Configuration', () => {
    it('should accept custom configuration on initialization', () => {
      const customConfig = {
        apiKey: 'custom_key',
        apiSecretKey: 'custom_secret',
        scopes: ['read_products'],
        hostName: 'custom.localhost'
      };

      const provider = ShopifyApiProvider.getInstance(customConfig);
      const config = provider.getConfig();

      expect(config.apiKey).toBe('custom_key');
      expect(config.apiSecretKey).toBe('custom_secret');
      expect(config.scopes).toEqual(['read_products']);
      expect(config.hostName).toBe('custom.localhost');
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        apiKey: 'test_key',
        apiSecretKey: 'test_secret',
        scopes: ['read_products'],
        hostName: 'test.localhost'
      };

      const provider = ShopifyApiProvider.getInstance(customConfig);
      expect(provider).toBeInstanceOf(ShopifyApiProvider);
    });
  });

  describe('Environment Configuration Loading', () => {
    it('should load configuration from environment variables', () => {
      process.env['SHOPIFY_API_KEY'] = 'env_key';
      process.env['SHOPIFY_API_SECRET'] = 'env_secret';
      process.env['SHOPIFY_APP_URL'] = 'env.localhost';

      ShopifyApiProvider.reset();
      const provider = ShopifyApiProvider.getInstance();
      const config = provider.getConfig();

      expect(config.apiKey).toBe('env_key');
      expect(config.apiSecretKey).toBe('env_secret');
      expect(config.hostName).toBe('env.localhost');
    });

    it('should use default values when environment variables are missing', () => {
      delete process.env['SHOPIFY_API_KEY'];
      delete process.env['SHOPIFY_API_SECRET'];
      delete process.env['SHOPIFY_APP_URL'];

      ShopifyApiProvider.reset();
      const provider = ShopifyApiProvider.getInstance();
      const config = provider.getConfig();

      expect(config.apiKey).toBe('');
      expect(config.apiSecretKey).toBe('');
      expect(config.hostName).toBe('localhost:3000');
    });
  });
});
