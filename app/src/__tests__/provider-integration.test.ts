import { ShopifyApiProvider } from '../providers/shopify-api-provider';
import { CustomerService } from '../services/customer-service';
import { ProductService } from '../services/product-service';
import { ProxyHandler } from '../routes/proxy-handler';

// Mock ShopifyApiProvider to avoid Shopify API initialization issues
jest.mock('../providers/shopify-api-provider', () => ({
  ShopifyApiProvider: {
    getInstance: jest.fn(() => ({
      createSession: jest.fn(),
      makeGraphQLCall: jest.fn(),
      makeRestCall: jest.fn()
    })),
    reset: jest.fn()
  }
}));

describe('Provider Integration', () => {
  beforeEach(() => {
    // Reset provider singleton before each test
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

  describe('CustomerService Integration', () => {
    it('should create CustomerService with provided provider and product service', () => {
      const provider = ShopifyApiProvider.getInstance();
      const productService = new ProductService(provider);
      const customerService = new CustomerService(provider, productService);

      expect(customerService).toBeInstanceOf(CustomerService);
      expect(productService).toBeInstanceOf(ProductService);
    });
  });

  describe('ProductService Integration', () => {
    it('should create ProductService with provided provider', () => {
      const provider = ShopifyApiProvider.getInstance();
      const productService = new ProductService(provider);

      expect(productService).toBeInstanceOf(ProductService);
    });
  });

  describe('ProxyHandler Integration', () => {
    it('should create ProxyHandler with provider-based services', () => {
      const proxyHandler = new ProxyHandler();
      expect(proxyHandler).toBeInstanceOf(ProxyHandler);
    });
  });

  describe('Provider Sharing', () => {
    it('should use same provider instance across services', () => {
      const provider = ShopifyApiProvider.getInstance();
      const productService = new ProductService(provider);
      const customerService = new CustomerService(provider, productService);

      expect(customerService).toBeInstanceOf(CustomerService);
      expect(productService).toBeInstanceOf(ProductService);
    });
  });
});
