import { ProductService } from '../services/product-service';
import { ShopifyApiProvider, ShopifyApiError } from '../providers/shopify-api-provider';
import { Session } from '@shopify/shopify-api';

// Mock the ShopifyApiProvider
jest.mock('../providers/shopify-api-provider');

describe('ProductService', () => {
  let productService: ProductService;
  let mockProvider: jest.Mocked<ShopifyApiProvider>;
  let mockSession: Session;
  let mockRestClient: any;

  beforeEach(() => {
    mockRestClient = {
      get: jest.fn()
    };

    mockProvider = {
      createRestClient: jest.fn().mockReturnValue(mockRestClient),
      makeApiCall: jest.fn()
    } as any;

    mockSession = { accessToken: 'test-token' } as Session;

    (ShopifyApiProvider.getInstance as jest.Mock).mockReturnValue(mockProvider);

    productService = new ProductService(mockProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductById', () => {
    it('should return product data when product exists', async () => {
      const mockProductResponse = {
        body: {
          product: {
            id: 456,
            title: 'Test Product',
            handle: 'test-product',
            variants: [{ price: '19.99' }],
            images: [{ src: 'https://example.com/product.jpg' }],
            status: 'active'
          }
        }
      };

      mockProvider.makeApiCall.mockResolvedValue(mockProductResponse);

      const result = await productService.getProductById(mockSession, 456);

      expect(result).toEqual({
        id: 456,
        title: 'Test Product',
        handle: 'test-product',
        price: '19.99',
        image_url: 'https://example.com/product.jpg',
        available: true
      });
    });

    it('should return null when product not found', async () => {
      const error = new ShopifyApiError('Product not found', 404);
      mockProvider.makeApiCall.mockRejectedValue(error);

      const result = await productService.getProductById(mockSession, 999);

      expect(result).toBeNull();
    });

    it('should throw error for other API errors', async () => {
      const error = new ShopifyApiError('Server error', 500);
      mockProvider.makeApiCall.mockRejectedValue(error);

      await expect(productService.getProductById(mockSession, 456))
        .rejects.toThrow('Server error');
    });
  });

  describe('validateProductId', () => {
    it('should return true for valid product ID', () => {
      expect(productService.validateProductId(456)).toBe(true);
    });

    it('should return false for invalid product ID', () => {
      expect(productService.validateProductId('456')).toBe(false);
      expect(productService.validateProductId(0)).toBe(false);
      expect(productService.validateProductId(-1)).toBe(false);
      expect(productService.validateProductId(1.5)).toBe(false);
    });
  });

  describe('getDefaultProductData', () => {
    it('should return default product data', () => {
      const result = productService.getDefaultProductData();

      expect(result).toEqual({
        id: 0,
        title: 'Featured Product',
        handle: 'featured-product',
        price: '0.00',
        image_url: ''
      });
    });
  });
});
