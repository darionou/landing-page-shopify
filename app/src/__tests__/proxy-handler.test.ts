import { Request, Response } from 'express';
import { ProxyHandler } from '../routes/proxy-handler';
import { CustomerService } from '../services/customer-service';
import { ProductService } from '../services/product-service';

// Mock the services
jest.mock('../services/customer-service');
jest.mock('../services/product-service');
jest.mock('../services/shopify-api-client');

describe('ProxyHandler', () => {
  let proxyHandler: ProxyHandler;
  let mockCustomerService: jest.Mocked<CustomerService>;
  let mockProductService: jest.Mocked<ProductService>;
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

    // Create proxy handler instance
    proxyHandler = new ProxyHandler();

    // Get mocked services
    mockCustomerService = (proxyHandler as any).customerService;
    mockProductService = (proxyHandler as any).productService;
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

    it('should return error for invalid user_id parameter', async () => {
      mockRequest.query = { user_id: 'invalid' };

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
      const mockCustomerData = {
        id: 123,
        first_name: 'John',
        email: 'john@example.com',
        profile_image_url: 'https://example.com/profile.jpg',
        assigned_product_id: 456
      };

      const mockAssignedProduct = {
        id: 456,
        title: 'Test Product',
        image_url: 'https://example.com/product.jpg',
        price: '29.99',
        handle: 'test-product'
      };

      mockRequest.query = { user_id: '123' };
      mockCustomerService.getCustomerById.mockResolvedValue(mockCustomerData);
      mockProductService.getAssignedProduct.mockResolvedValue(mockAssignedProduct);

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

    it('should use default product when no assigned product', async () => {
      const mockCustomerData = {
        id: 123,
        first_name: 'John',
        email: 'john@example.com',
        assigned_product_id: undefined
      };

      const mockDefaultProduct = {
        id: 789,
        title: 'Default Product',
        image_url: 'https://example.com/default.jpg',
        price: '19.99',
        handle: 'default-product'
      };

      mockRequest.query = { user_id: '123' };
      mockCustomerService.getCustomerById.mockResolvedValue(mockCustomerData);
      mockProductService.getDefaultProduct.mockResolvedValue(mockDefaultProduct);

      await proxyHandler.handleUserLanding(mockRequest as Request, mockResponse as Response);

      expect(mockProductService.getDefaultProduct).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          user_id: '123',
          first_name: 'John',
          profile_image_url: '/assets/default-avatar.png',
          assigned_product: mockDefaultProduct
        }
      });
    });

    it('should use fallback data when assigned product not found', async () => {
      const mockCustomerData = {
        id: 123,
        first_name: 'John',
        email: 'john@example.com',
        assigned_product_id: 456
      };

      const mockFallbackProduct = {
        id: 0,
        title: 'Featured Product',
        image_url: '',
        price: '0.00',
        handle: 'featured-product'
      };

      mockRequest.query = { user_id: '123' };
      mockCustomerService.getCustomerById.mockResolvedValue(mockCustomerData);
      mockProductService.getAssignedProduct.mockResolvedValue(null);
      mockProductService.getDefaultProduct.mockResolvedValue(null);
      mockProductService.getDefaultProductData.mockReturnValue(mockFallbackProduct);

      await proxyHandler.handleUserLanding(mockRequest as Request, mockResponse as Response);

      expect(mockProductService.getAssignedProduct).toHaveBeenCalledWith(expect.any(Object), 456);
      expect(mockProductService.getDefaultProduct).toHaveBeenCalled();
      expect(mockProductService.getDefaultProductData).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          user_id: '123',
          first_name: 'John',
          profile_image_url: '/assets/default-avatar.png',
          assigned_product: mockFallbackProduct
        }
      });
    });

    it('should handle service errors gracefully', async () => {
      mockRequest.query = { user_id: '123' };
      mockCustomerService.getCustomerById.mockRejectedValue(new Error('Service error'));

      await proxyHandler.handleUserLanding(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Service error'
      });
    });

    it('should use default values for missing customer data', async () => {
      const mockCustomerData = {
        id: 123,
        first_name: '',
        email: 'john@example.com'
      };

      const mockDefaultProduct = {
        id: 0,
        title: 'Featured Product',
        image_url: '',
        price: '0.00',
        handle: 'featured-product'
      };

      mockRequest.query = { user_id: '123' };
      mockCustomerService.getCustomerById.mockResolvedValue(mockCustomerData);
      mockProductService.getDefaultProduct.mockResolvedValue(null);
      mockProductService.getDefaultProductData.mockReturnValue(mockDefaultProduct);

      await proxyHandler.handleUserLanding(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          user_id: '123',
          first_name: 'Valued Customer',
          profile_image_url: '/assets/default-avatar.png',
          assigned_product: mockDefaultProduct
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
