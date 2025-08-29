/// <reference types="jest" />
import { CustomerService } from '../services/customer-service';
import { ShopifyApiProvider } from '../providers/shopify-api-provider';
import { ProductService } from '../services/product-service';
import { ShopifyApiError } from '../errors/ServerError';
import { Session } from '@shopify/shopify-api';

// Mock the ShopifyApiProvider
jest.mock('../providers/shopify-api-provider');

describe('CustomerService', () => {
  let customerService: CustomerService;
  let mockProvider: jest.Mocked<ShopifyApiProvider>;
  let mockProductService: jest.Mocked<ProductService>;
  let mockSession: Session;

  beforeEach(() => {
    mockProvider = {
      createGraphQLClient: jest.fn().mockReturnValue({ request: jest.fn() }),
      makeGraphQLCall: jest.fn(),
      makeRestCall: jest.fn()
    } as any;

    mockProductService = {
      getProductById: jest.fn()
    } as any;

    mockSession = { accessToken: 'test-token' } as Session;

    (ShopifyApiProvider.getInstance as jest.Mock).mockReturnValue(mockProvider);

    customerService = new CustomerService(mockProvider, mockProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCustomerById', () => {
    it('should return customer data when customer exists', async () => {


      const mockGraphQLResponse = {
        customer: {
          id: '123',
          firstName: 'John',
          email: 'john@example.com',
          metafields: {
            edges: [
              {
                node: {
                  key: 'profile_image_url',
                  value: 'https://example.com/image.jpg'
                }
              },
              {
                node: {
                  key: 'assigned_product_id',
                  value: '456'
                }
              }
            ]
          }
        }
      };

      mockProvider.makeGraphQLCall.mockResolvedValue(mockGraphQLResponse);
      mockProductService.getProductById.mockResolvedValue({
        id: 456,
        title: 'Test Product',
        handle: 'test-product',
        price: '19.99',
        image_url: 'https://example.com/product.jpg',
        available: true
      });

      const result = await customerService.getCustomerById(mockSession, '123');

      expect(result).toEqual({
        id: '123',
        first_name: 'John',
        email: 'john@example.com',
        profile_image_url: 'https://example.com/image.jpg',
        assigned_product_id: 456,
        assigned_product: {
          id: 456,
          title: 'Test Product',
          handle: 'test-product',
          price: '19.99',
          image_url: 'https://example.com/product.jpg',
          available: true
        }
      });
    });

    it('should return null when customer not found', async () => {
      mockProvider.makeGraphQLCall.mockResolvedValue({ customer: null });

      const result = await customerService.getCustomerById(mockSession, '999');

      expect(result).toBeNull();
    });

    it('should throw error for other API errors', async () => {
      const error = new ShopifyApiError('Server error', 500);
      mockProvider.makeGraphQLCall.mockRejectedValue(error);

      await expect(customerService.getCustomerById(mockSession, '123'))
        .rejects.toThrow('Server error');
    });
  });

  describe('createCustomer', () => {
    it('should create customer successfully', async () => {
      const mockCreateResponse = {
        customer: {
          id: 123,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com'
        }
      };

      mockProvider.makeRestCall.mockResolvedValue(mockCreateResponse);

      const result = await customerService.createCustomer(mockSession, {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        profile_image_url: 'https://example.com/image.jpg'
      });

      expect(result).toBe(123);
    });
  });
});
