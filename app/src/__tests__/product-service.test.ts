import { ProductService } from '../services/product-service';
import { ShopifyApiClient, ShopifyApiError } from '../services/shopify-api-client';
import { Session } from '@shopify/shopify-api';

// Mock the ShopifyApiClient but keep ShopifyApiError
jest.mock('../services/shopify-api-client', () => ({
  ShopifyApiClient: jest.fn(),
  ShopifyApiError: jest.requireActual('../services/shopify-api-client').ShopifyApiError
}));

describe('ProductService', () => {
  let productService: ProductService;
  let mockApiClient: jest.Mocked<ShopifyApiClient>;
  let mockSession: Session;
  let mockRestClient: any;

  beforeEach(() => {
    mockRestClient = {
      get: jest.fn()
    };

    mockApiClient = {
      createRestClient: jest.fn().mockReturnValue(mockRestClient),
      makeApiCall: jest.fn(),
      validateResponse: jest.fn()
    } as any;

    mockSession = { shop: 'test-shop' } as Session;
    productService = new ProductService(mockApiClient);
  });

  describe('getProductById', () => {
    it('should return product data', async () => {
      const mockProductResponse = {
        body: {
          product: {
            id: 456,
            title: 'Test Product',
            handle: 'test-product',
            variants: [{ price: '29.99' }],
            images: [{ src: 'https://example.com/product.jpg' }]
          }
        }
      };

      mockApiClient.makeApiCall.mockResolvedValue(mockProductResponse);

      const result = await productService.getProductById(mockSession, 456);

      expect(result).toEqual({
        id: 456,
        title: 'Test Product',
        handle: 'test-product',
        price: '29.99',
        image_url: 'https://example.com/product.jpg',
        available: true
      });

      expect(mockApiClient.makeApiCall).toHaveBeenCalledTimes(1);
      expect(mockApiClient.validateResponse).toHaveBeenCalledTimes(1);
    });

    it('should return null for non-existent product', async () => {
      const notFoundError = new ShopifyApiError('Product not found', 404);
      mockApiClient.makeApiCall.mockRejectedValue(notFoundError);

      const result = await productService.getProductById(mockSession, 999);

      expect(result).toBeNull();
    });

    it('should handle product with no variants or images', async () => {
      const mockProductResponse = {
        body: {
          product: {
            id: 456,
            title: 'Test Product',
            handle: 'test-product',
            variants: [],
            images: []
          }
        }
      };

      mockApiClient.makeApiCall.mockResolvedValue(mockProductResponse);

      const result = await productService.getProductById(mockSession, 456);

      expect(result).toEqual({
        id: 456,
        title: 'Test Product',
        handle: 'test-product',
        price: '0.00',
        image_url: undefined,
        available: false
      });
    });

    it('should handle missing product data gracefully', async () => {
      const mockProductResponse = {
        body: {
          product: {
            id: 456,
            title: null,
            handle: null,
            variants: [{ price: '19.99' }],
            images: [{ src: 'https://example.com/image.jpg' }]
          }
        }
      };

      mockApiClient.makeApiCall.mockResolvedValue(mockProductResponse);

      const result = await productService.getProductById(mockSession, 456);

      expect(result).toEqual({
        id: 456,
        title: 'Untitled Product',
        handle: '',
        price: '19.99',
        image_url: 'https://example.com/image.jpg',
        available: true
      });
    });

    it('should throw error for other API errors', async () => {
      const serverError = new ShopifyApiError('Server error', 500);
      mockApiClient.makeApiCall.mockRejectedValue(serverError);

      await expect(productService.getProductById(mockSession, 456))
        .rejects.toThrow(ShopifyApiError);
    });
  });

  describe('getAssignedProduct', () => {
    it('should return assigned product data', async () => {
      const mockProductResponse = {
        body: {
          product: {
            id: 456,
            title: 'Assigned Product',
            handle: 'assigned-product',
            variants: [{ price: '39.99' }],
            images: [{ src: 'https://example.com/assigned.jpg' }]
          }
        }
      };

      mockApiClient.makeApiCall.mockResolvedValue(mockProductResponse);

      const result = await productService.getAssignedProduct(mockSession, 456);

      expect(result).toEqual({
        id: 456,
        title: 'Assigned Product',
        image_url: 'https://example.com/assigned.jpg',
        price: '39.99',
        handle: 'assigned-product'
      });
    });

    it('should return null for non-existent assigned product', async () => {
      const notFoundError = new ShopifyApiError('Product not found', 404);
      mockApiClient.makeApiCall.mockRejectedValue(notFoundError);

      const result = await productService.getAssignedProduct(mockSession, 999);

      expect(result).toBeNull();
    });
  });

  describe('getDefaultProduct', () => {
    it('should return first active product as default', async () => {
      const mockProductsResponse = {
        body: {
          products: [{
            id: 123,
            title: 'Default Product',
            handle: 'default-product',
            variants: [{ price: '49.99' }],
            images: [{ src: 'https://example.com/default.jpg' }]
          }]
        }
      };

      mockApiClient.makeApiCall.mockResolvedValue(mockProductsResponse);

      const result = await productService.getDefaultProduct(mockSession);

      expect(result).toEqual({
        id: 123,
        title: 'Default Product',
        image_url: 'https://example.com/default.jpg',
        price: '49.99',
        handle: 'default-product'
      });
    });

    it('should return null when no products available', async () => {
      const mockProductsResponse = {
        body: { products: [] }
      };

      mockApiClient.makeApiCall.mockResolvedValue(mockProductsResponse);

      const result = await productService.getDefaultProduct(mockSession);

      expect(result).toBeNull();
    });

    it('should return null on API error', async () => {
      mockApiClient.makeApiCall.mockRejectedValue(new Error('API error'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await productService.getDefaultProduct(mockSession);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('validateProductId', () => {
    it('should validate positive integers', () => {
      expect(productService.validateProductId(456)).toBe(true);
      expect(productService.validateProductId(1)).toBe(true);
    });

    it('should reject invalid values', () => {
      expect(productService.validateProductId(0)).toBe(false);
      expect(productService.validateProductId(-1)).toBe(false);
      expect(productService.validateProductId(1.5)).toBe(false);
      expect(productService.validateProductId('456')).toBe(false);
      expect(productService.validateProductId(null)).toBe(false);
      expect(productService.validateProductId(undefined)).toBe(false);
    });
  });

  describe('isProductAvailable', () => {
    it('should return true for available product', async () => {
      const mockProductResponse = {
        body: {
          product: {
            id: 456,
            title: 'Available Product',
            handle: 'available-product',
            variants: [{ price: '29.99' }],
            images: []
          }
        }
      };

      mockApiClient.makeApiCall.mockResolvedValue(mockProductResponse);

      const result = await productService.isProductAvailable(mockSession, 456);

      expect(result).toBe(true);
    });

    it('should return false for unavailable product', async () => {
      const mockProductResponse = {
        body: {
          product: {
            id: 456,
            title: 'Unavailable Product',
            handle: 'unavailable-product',
            variants: [],
            images: []
          }
        }
      };

      mockApiClient.makeApiCall.mockResolvedValue(mockProductResponse);

      const result = await productService.isProductAvailable(mockSession, 456);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockApiClient.makeApiCall.mockRejectedValue(new Error('API error'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await productService.isProductAvailable(mockSession, 456);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getProductsByIds', () => {
    it('should return multiple products', async () => {
      const mockProductResponse1 = {
        body: {
          product: {
            id: 123,
            title: 'Product 1',
            handle: 'product-1',
            variants: [{ price: '19.99' }],
            images: [{ src: 'https://example.com/1.jpg' }]
          }
        }
      };

      const mockProductResponse2 = {
        body: {
          product: {
            id: 456,
            title: 'Product 2',
            handle: 'product-2',
            variants: [{ price: '29.99' }],
            images: [{ src: 'https://example.com/2.jpg' }]
          }
        }
      };

      mockApiClient.makeApiCall
        .mockResolvedValueOnce(mockProductResponse1)
        .mockResolvedValueOnce(mockProductResponse2);

      const result = await productService.getProductsByIds(mockSession, [123, 456]);

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe(123);
      expect(result[1]?.id).toBe(456);
    });

    it('should handle errors gracefully and continue with other products', async () => {
      const mockProductResponse = {
        body: {
          product: {
            id: 456,
            title: 'Product 2',
            handle: 'product-2',
            variants: [{ price: '29.99' }],
            images: []
          }
        }
      };

      mockApiClient.makeApiCall
        .mockRejectedValueOnce(new Error('Product 1 error'))
        .mockResolvedValueOnce(mockProductResponse);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await productService.getProductsByIds(mockSession, [123, 456]);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(456);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getDefaultProductData', () => {
    it('should return default product data', () => {
      const result = productService.getDefaultProductData();

      expect(result).toEqual({
        id: 0,
        title: 'Featured Product',
        image_url: '',
        price: '0.00',
        handle: 'featured-product'
      });
    });
  });
});
