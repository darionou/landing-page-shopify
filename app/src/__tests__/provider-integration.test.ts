import { ShopifyApiProvider } from '../providers/shopify-api-provider';
import { CustomerService } from '../services/customer-service';
import { ProductService } from '../services/product-service';
import { ProxyHandler } from '../routes/proxy-handler';

// Mock ShopifyApiProvider to avoid Shopify API initialization issues
jest.mock('../providers/shopify-api-provider');

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
    it('should create CustomerService with default provider when no provider passed', () => {
      const customerService = new CustomerService();
      expect(customerService).toBeInstanceOf(CustomerService);
      expect((customerService as any).apiProvider).toBeDefined();
    });

    it('should create CustomerService with provided provider', () => {
      const provider = ShopifyApiProvider.getInstance();
      const customerService = new CustomerService(provider);

      expect(customerService).toBeInstanceOf(CustomerService);
      expect((customerService as any).apiProvider).toBeDefined();
    });
  });

  describe('ProductService Integration', () => {
    it('should create ProductService with default provider when no provider passed', () => {
      const productService = new ProductService();
      expect(productService).toBeInstanceOf(ProductService);
      expect((productService as any).apiProvider).toBeDefined();
    });

    it('should create ProductService with provided provider', () => {
      const provider = ShopifyApiProvider.getInstance();
      const productService = new ProductService(provider);

      expect(productService).toBeInstanceOf(ProductService);
      expect((productService as any).apiProvider).toBeDefined();
    });
  });

  describe('ProxyHandler Integration', () => {
    it('should create ProxyHandler with provider-based services', () => {
      const proxyHandler = new ProxyHandler();
      expect(proxyHandler).toBeInstanceOf(ProxyHandler);
      expect((proxyHandler as any).customerService).toBeInstanceOf(CustomerService);
      expect((proxyHandler as any).productService).toBeInstanceOf(ProductService);
      expect((proxyHandler as any).apiProvider).toBeInstanceOf(ShopifyApiProvider);
    });
  });

  describe('Provider Sharing', () => {
    it('should use same provider instance across services', () => {
      const provider = ShopifyApiProvider.getInstance();
      const customerService = new CustomerService(provider);
      const productService = new ProductService(provider);

      expect(customerService).toBeInstanceOf(CustomerService);
      expect(productService).toBeInstanceOf(ProductService);
    });

    it('should create services without explicit provider', () => {
      const customerService = new CustomerService();
      const productService = new ProductService();

      expect(customerService).toBeInstanceOf(CustomerService);
      expect(productService).toBeInstanceOf(ProductService);
    });
  });
});
