import { CustomerService } from '../services/customer-service';
import { ShopifyApiProvider, ShopifyApiError } from '../providers/shopify-api-provider';
import { Session } from '@shopify/shopify-api';

// Mock the ShopifyApiProvider
jest.mock('../providers/shopify-api-provider');

describe('CustomerService', () => {
  let customerService: CustomerService;
  let mockProvider: jest.Mocked<ShopifyApiProvider>;
  let mockSession: Session;
  let mockRestClient: any;

  beforeEach(() => {
    mockRestClient = {
      get: jest.fn(),
      post: jest.fn()
    };

    mockProvider = {
      createRestClient: jest.fn().mockReturnValue(mockRestClient),
      makeApiCall: jest.fn()
    } as any;

    mockSession = { accessToken: 'test-token' } as Session;

    (ShopifyApiProvider.getInstance as jest.Mock).mockReturnValue(mockProvider);

    customerService = new CustomerService(mockProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCustomerById', () => {
    it('should return customer data when customer exists', async () => {
      const mockCustomerResponse = {
        body: {
          customer: {
            id: 123,
            first_name: 'John',
            email: 'john@example.com'
          }
        }
      };

      const mockMetafieldsResponse = {
        body: {
          metafields: [
            {
              namespace: 'personalization',
              key: 'profile_image_url',
              value: 'https://example.com/image.jpg'
            },
            {
              namespace: 'personalization',
              key: 'assigned_product_id',
              value: '456'
            }
          ]
        }
      };

      mockProvider.makeApiCall
        .mockResolvedValueOnce(mockCustomerResponse)
        .mockResolvedValueOnce(mockMetafieldsResponse);

      const result = await customerService.getCustomerById(mockSession, 123);

      expect(result).toEqual({
        id: 123,
        first_name: 'John',
        email: 'john@example.com',
        profile_image_url: 'https://example.com/image.jpg',
        assigned_product_id: 456
      });
    });

    it('should return null when customer not found', async () => {
      const error = new ShopifyApiError('Customer not found', 404);
      mockProvider.makeApiCall.mockRejectedValue(error);

      const result = await customerService.getCustomerById(mockSession, 999);

      expect(result).toBeNull();
    });

    it('should throw error for other API errors', async () => {
      const error = new ShopifyApiError('Server error', 500);
      mockProvider.makeApiCall.mockRejectedValue(error);

      await expect(customerService.getCustomerById(mockSession, 123))
        .rejects.toThrow('Server error');
    });
  });

  describe('validateCustomerId', () => {
    it('should return true for valid customer ID', () => {
      expect(customerService.validateCustomerId(123)).toBe(true);
    });

    it('should return false for invalid customer ID', () => {
      expect(customerService.validateCustomerId('123')).toBe(false);
      expect(customerService.validateCustomerId(0)).toBe(false);
      expect(customerService.validateCustomerId(-1)).toBe(false);
      expect(customerService.validateCustomerId(1.5)).toBe(false);
    });
  });

  describe('getDefaultCustomerData', () => {
    it('should return default customer data', () => {
      const result = customerService.getDefaultCustomerData(123);

      expect(result).toEqual({
        id: 123,
        first_name: 'Valued Customer',
        email: '',
        profile_image_url: undefined,
        assigned_product_id: undefined
      });
    });
  });
});
