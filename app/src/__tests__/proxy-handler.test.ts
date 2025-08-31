import { Request, Response } from 'express';
import { ProxyHandler } from '../routes/proxy-handler';
import { CustomerService } from '../services/customer-service';

// Mock the services and provider
jest.mock('../services/customer-service');
jest.mock('../services/product-service');
jest.mock('../providers/shopify-api-provider', () => ({
  ShopifyApiProvider: {
    getInstance: jest.fn(() => ({
      createSession: jest.fn(() => ({ accessToken: 'test-token' })),
      makeGraphQLCall: jest.fn(),
      makeRestCall: jest.fn()
    }))
  }
}));

describe('ProxyHandler', () => {
  let proxyHandler: ProxyHandler;
  let mockCustomerService: jest.Mocked<CustomerService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock response
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    // Create mock request
    mockRequest = {
      query: {},
      headers: {}
    };

    // Setup customer service mock methods
    mockCustomerService = {
      getCustomerById: jest.fn()
    } as any;

    // Create proxy handler instance
    proxyHandler = new ProxyHandler();

    // Replace the customer service with our mock
    (proxyHandler as any).customerService = mockCustomerService;
  });

  describe('handleUserLanding', () => {
    it('should return error for missing user_id parameter', async () => {
      mockRequest.query = {};

      await proxyHandler.handleUserLanding(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or missing user_id parameter'
      });
    });

    it('should return error when customer not found', async () => {
      mockRequest.query = { user_id: '123' };
      mockCustomerService.getCustomerById.mockResolvedValue(null);

      await proxyHandler.handleUserLanding(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Customer not found'
      });
    });

    it('should return user profile with assigned product', async () => {
      const mockAssignedProduct = {
        id: 456,
        title: 'Test Product',
        image_url: 'https://example.com/product.jpg',
        price: '29.99',
        handle: 'test-product',
        available: true
      };

      const mockCustomerData = {
        id: '123',
        first_name: 'John',
        email: 'john@example.com',
        profile_image_url: 'https://example.com/profile.jpg',
        assigned_product_id: 456,
        assigned_product: mockAssignedProduct
      };

      mockRequest.query = { user_id: '123' };
      mockCustomerService.getCustomerById.mockResolvedValue(mockCustomerData);

      await proxyHandler.handleUserLanding(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          user_id: '123',
          first_name: 'John',
          profile_image_url: 'https://example.com/profile.jpg',
          assigned_product: mockAssignedProduct
        }
      });
    });

    it('should use no assigned product when none provided', async () => {
      const mockCustomerData = {
        id: '123',
        first_name: 'John',
        email: 'john@example.com',
        assigned_product_id: undefined,
        assigned_product: undefined
      };

      mockRequest.query = { user_id: '123' };
      mockCustomerService.getCustomerById.mockResolvedValue(mockCustomerData);

      await proxyHandler.handleUserLanding(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          user_id: '123',
          first_name: 'John',
          profile_image_url: undefined,
          assigned_product: undefined
        }
      });
    });

    it('should handle customer with assigned product properly', async () => {
      const mockAssignedProduct = {
        id: 456,
        title: 'Test Product',
        image_url: 'https://example.com/product.jpg',
        price: '29.99',
        handle: 'test-product',
        available: true
      };

      const mockCustomerData = {
        id: '123',
        first_name: 'John',
        email: 'john@example.com',
        assigned_product_id: 456,
        assigned_product: mockAssignedProduct
      };

      mockRequest.query = { user_id: '123' };
      mockCustomerService.getCustomerById.mockResolvedValue(mockCustomerData);

      await proxyHandler.handleUserLanding(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          user_id: '123',
          first_name: 'John',
          profile_image_url: undefined,
          assigned_product: mockAssignedProduct
        }
      });
    });
  });

  describe('validateProxySignature', () => {
    it('should return true for valid signature (placeholder)', () => {
      const result = proxyHandler.validateProxySignature();
      expect(result).toBe(true);
    });
  });
});
