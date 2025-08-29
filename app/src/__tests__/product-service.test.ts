import { ProductService } from '../services/product-service';
import { ShopifyApiProvider } from '../providers/shopify-api-provider';
import { ShopifyApiError } from '../errors/ServerError';
import { Session } from '@shopify/shopify-api';

// Mock the ShopifyApiProvider
jest.mock('../providers/shopify-api-provider');

describe('ProductService', () => {
  let productService: ProductService;
  let mockProvider: jest.Mocked<ShopifyApiProvider>;
  let mockSession: Session;

  beforeEach(() => {
    mockProvider = {
      createGraphQLClient: jest.fn().mockReturnValue({ request: jest.fn() }),
      makeGraphQLCall: jest.fn(),
      makeRestCall: jest.fn()
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
      const mockGraphQLProduct = {
        id: 'gid://shopify/Product/456',
        title: 'Test Product',
        handle: 'test-product',
        status: 'ACTIVE',
        variants: {
          edges: [
            {
              node: {
                price: '19.99',
                availableForSale: true
              }
            }
          ]
        },
        images: {
          edges: [
            {
              node: {
                url: 'https://example.com/product.jpg'
              }
            }
          ]
        }
      };

      mockProvider.makeGraphQLCall.mockResolvedValue({
        product: mockGraphQLProduct
      });

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
      mockProvider.makeGraphQLCall.mockResolvedValue({ product: null });

      const result = await productService.getProductById(mockSession, 999);

      expect(result).toBeNull();
    });

    it('should throw error for other API errors', async () => {
      const error = new ShopifyApiError('Server error', 500);
      mockProvider.makeGraphQLCall.mockRejectedValue(error);

      await expect(productService.getProductById(mockSession, 456))
        .rejects.toThrow('Server error');
    });
  });

  describe('createProduct', () => {
    it('should create product successfully', async () => {
      const mockCreateResponse = {
        product: {
          id: 123,
          title: 'Test Product',
          handle: 'test-product'
        }
      };

      mockProvider.makeRestCall = jest.fn().mockResolvedValue(mockCreateResponse);

      const result = await productService.createProduct(mockSession, {
        title: 'Test Product',
        handle: 'test-product',
        description: 'A test product',
        price: '19.99',
        image_url: 'https://example.com/test.jpg'
      });

      expect(result).toBe(123);
    });
  });
});
