import { Request, Response } from 'express';
import { Session } from '@shopify/shopify-api';
import { CustomerService } from '../services/customer-service';
import { ProductService } from '../services/product-service';
import { ShopifyApiClient, ShopifyApiConfig } from '../services/shopify-api-client';
import { UserProfile, ProxyResponse, validateUserId } from '../types';

export class ProxyHandler {
  private customerService: CustomerService;
  private productService: ProductService;
  private apiClient: ShopifyApiClient;

  constructor() {
    const config: ShopifyApiConfig = {
      apiKey: process.env['SHOPIFY_API_KEY'] || '',
      apiSecretKey: process.env['SHOPIFY_API_SECRET'] || '',
      scopes: (process.env['SHOPIFY_SCOPES'] || 'read_customers,read_products').split(','),
      hostName: process.env['SHOPIFY_APP_URL'] || 'localhost:3000'
    };
    
    this.apiClient = new ShopifyApiClient(config);
    this.customerService = new CustomerService(this.apiClient);
    this.productService = new ProductService(this.apiClient);
  }

  /**
   * Handles the user landing endpoint proxy request
   * Processes user_id parameter and returns personalized data
   */
  async handleUserLanding(req: Request, res: Response): Promise<void> {
    try {
      // Extract user_id from query parameters
      const { user_id } = req.query;

      // Validate user_id parameter
      if (!user_id || !validateUserId(user_id)) {
        const response: ProxyResponse = {
          success: false,
          error: 'Invalid or missing user_id parameter'
        };
        res.status(400).json(response);
        return;
      }

      const customerId = parseInt(user_id as string, 10);

      // Create a session for Shopify API calls
      // In a real app, this would come from the authenticated session
      const session = this.createSession(req);

      // Retrieve customer data
      const customerData = await this.customerService.getCustomerById(session, customerId);
      
      if (!customerData) {
        const response: ProxyResponse = {
          success: false,
          error: 'Customer not found'
        };
        res.status(404).json(response);
        return;
      }

      // Get assigned product or default product
      let assignedProduct;
      if (customerData.assigned_product_id) {
        assignedProduct = await this.productService.getAssignedProduct(
          session, 
          customerData.assigned_product_id
        );
      }

      // Fallback to default product if no assigned product found
      if (!assignedProduct) {
        assignedProduct = await this.productService.getDefaultProduct(session);
      }

      // Fallback to default product data if still no product
      if (!assignedProduct) {
        assignedProduct = this.productService.getDefaultProductData();
      }

      // Build user profile response
      const userProfile: UserProfile = {
        user_id: user_id as string,
        first_name: customerData.first_name || 'Valued Customer',
        profile_image_url: customerData.profile_image_url || this.getDefaultProfileImage(),
        assigned_product: assignedProduct
      };

      const response: ProxyResponse = {
        success: true,
        data: userProfile
      };

      res.json(response);

    } catch (error) {
      console.error('Error in handleUserLanding:', error);
      
      const response: ProxyResponse = {
        success: false,
        error: process.env['NODE_ENV'] === 'production' 
          ? 'Internal server error' 
          : (error as Error).message
      };
      
      res.status(500).json(response);
    }
  }

  /**
   * Creates a Shopify session for API calls
   * In production, this should be properly authenticated
   */
  private createSession(req: Request): Session {
    // For now, create a basic session
    // In production, you would extract this from authenticated request
    const shop = req.headers['x-shopify-shop-domain'] as string || 
                 process.env['SHOPIFY_SHOP_DOMAIN'] || 
                 'example.myshopify.com';

    return {
      id: `session_${Date.now()}`,
      shop: shop,
      state: 'authenticated',
      isOnline: false,
      scope: process.env['SHOPIFY_SCOPES'] || 'read_customers,read_products',
      accessToken: process.env['SHOPIFY_ACCESS_TOKEN'] || ''
    } as Session;
  }

  /**
   * Returns default profile image URL
   */
  private getDefaultProfileImage(): string {
    return '/assets/default-avatar.png';
  }

  /**
   * Validates Shopify proxy request signature (placeholder)
   * In production, implement proper signature verification
   */
  validateProxySignature(_req: Request): boolean {
    // Placeholder for signature validation
    // In production, verify the request signature using Shopify's method
    return true;
  }
}