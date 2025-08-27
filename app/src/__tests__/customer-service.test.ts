import { CustomerService } from '../services/customer-service';
import { ShopifyApiClient, ShopifyApiError } from '../services/shopify-api-client';
import { Session } from '@shopify/shopify-api';

// Mock the ShopifyApiClient but keep ShopifyApiError
jest.mock('../services/shopify-api-client', () => ({
  ShopifyApiClient: jest.fn(),
  ShopifyApiError: jest.requireActual('../services/shopify-api-client').ShopifyApiError
}));

describe('CustomerService', () => {
  let customerService: CustomerService;
  let mockApiClient: jest.Mocked<ShopifyApiClient>;
  let mockSession: Session;
  let mockRestClient: any;

  beforeEach(() => {
    mockRestClient = {
      get: jest.fn(),
      post: jest.fn()
    };

    mockApiClient = {
      createRestClient: jest.fn().mockReturnValue(mockRestClient),
      makeApiCall: jest.fn(),
      validateResponse: jest.fn()
    } as any;

    mockSession = { shop: 'test-shop' } as Session;
    customerService = new CustomerService(mockApiClient);
  });

  describe('getCustomerById', () => {
    it('should return customer data with metafields', async () => {
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
              id: 1,
              namespace: 'personalization',
              key: 'profile_image_url',
              value: 'https://example.com/image.jpg'
            },
            {
              id: 2,
              namespace: 'personalization',
              key: 'assigned_product_id',
              value: '456'
            }
          ]
        }
      };

      mockApiClient.makeApiCall
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

      expect(mockApiClient.makeApiCall).toHaveBeenCalledTimes(2);
      expect(mockApiClient.validateResponse).toHaveBeenCalledTimes(2);
    });

    it('should return null for non-existent customer', async () => {
      const notFoundError = new ShopifyApiError('Customer not found', 404);
      mockApiClient.makeApiCall.mockRejectedValue(notFoundError);

      const result = await customerService.getCustomerById(mockSession, 999);

      expect(result).toBeNull();
    });

    it('should return customer data without metafields if metafields fail', async () => {
      const mockCustomerResponse = {
        body: {
          customer: {
            id: 123,
            first_name: 'John',
            email: 'john@example.com'
          }
        }
      };

      mockApiClient.makeApiCall
        .mockResolvedValueOnce(mockCustomerResponse)
        .mockRejectedValueOnce(new Error('Metafields error'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await customerService.getCustomerById(mockSession, 123);

      expect(result).toEqual({
        id: 123,
        first_name: 'John',
        email: 'john@example.com',
        profile_image_url: undefined,
        assigned_product_id: undefined
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle missing customer data gracefully', async () => {
      const mockCustomerResponse = {
        body: {
          customer: {
            id: 123,
            first_name: null,
            email: null
          }
        }
      };

      const mockMetafieldsResponse = {
        body: { metafields: [] }
      };

      mockApiClient.makeApiCall
        .mockResolvedValueOnce(mockCustomerResponse)
        .mockResolvedValueOnce(mockMetafieldsResponse);

      const result = await customerService.getCustomerById(mockSession, 123);

      expect(result).toEqual({
        id: 123,
        first_name: '',
        email: '',
        profile_image_url: undefined,
        assigned_product_id: undefined
      });
    });

    it('should throw error for other API errors', async () => {
      const serverError = new ShopifyApiError('Server error', 500);
      mockApiClient.makeApiCall.mockRejectedValue(serverError);

      await expect(customerService.getCustomerById(mockSession, 123))
        .rejects.toThrow(ShopifyApiError);
    });
  });

  describe('getCustomerMetafields', () => {
    it('should return parsed metafields', async () => {
      const mockResponse = {
        body: {
          metafields: [
            {
              id: 1,
              namespace: 'personalization',
              key: 'profile_image_url',
              value: 'https://example.com/image.jpg'
            },
            {
              id: 2,
              namespace: 'personalization',
              key: 'assigned_product_id',
              value: '456'
            },
            {
              id: 3,
              namespace: 'other',
              key: 'other_field',
              value: 'ignored'
            }
          ]
        }
      };

      mockApiClient.makeApiCall.mockResolvedValue(mockResponse);

      const result = await customerService.getCustomerMetafields(mockSession, 123);

      expect(result).toEqual({
        profile_image_url: 'https://example.com/image.jpg',
        assigned_product_id: '456'
      });
    });

    it('should return empty object on error', async () => {
      mockApiClient.makeApiCall.mockRejectedValue(new Error('API error'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await customerService.getCustomerMetafields(mockSession, 123);

      expect(result).toEqual({});
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('updateCustomerMetafields', () => {
    it('should update metafields successfully', async () => {
      mockApiClient.makeApiCall.mockResolvedValue({});

      await customerService.updateCustomerMetafields(mockSession, 123, {
        profile_image_url: 'https://example.com/new-image.jpg',
        assigned_product_id: '789'
      });

      expect(mockApiClient.makeApiCall).toHaveBeenCalledTimes(2);
    });

    it('should skip undefined values', async () => {
      mockApiClient.makeApiCall.mockResolvedValue({});

      const metafields = {
        profile_image_url: 'https://example.com/image.jpg'
      };

      await customerService.updateCustomerMetafields(mockSession, 123, metafields);

      expect(mockApiClient.makeApiCall).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateCustomerId', () => {
    it('should validate positive integers', () => {
      expect(customerService.validateCustomerId(123)).toBe(true);
      expect(customerService.validateCustomerId(1)).toBe(true);
    });

    it('should reject invalid values', () => {
      expect(customerService.validateCustomerId(0)).toBe(false);
      expect(customerService.validateCustomerId(-1)).toBe(false);
      expect(customerService.validateCustomerId(1.5)).toBe(false);
      expect(customerService.validateCustomerId('123')).toBe(false);
      expect(customerService.validateCustomerId(null)).toBe(false);
      expect(customerService.validateCustomerId(undefined)).toBe(false);
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
