import { Request, Response } from 'express';
import { Session } from '@shopify/shopify-api';
import { CustomerService } from '../services/customer-service';
import { ShopifyApiProvider } from '../providers/shopify-api-provider';
import { UserProfile, ProxyResponse, AssignedProduct } from '../types';
import { ProductService } from '../services/product-service';


export class ProxyHandler {
  private customerService: CustomerService;
  private apiProvider: ShopifyApiProvider;

  constructor() {
    this.apiProvider = ShopifyApiProvider.getInstance();
    const productService = new ProductService(this.apiProvider);
    this.customerService = new CustomerService(this.apiProvider, productService);
  }

  /**
   * Handles the user landing endpoint proxy request
   * Processes user_id parameter and returns personalized data
   */
  async handleUserLanding(req: Request, res: Response): Promise<void> {
    try {
      const { user_id } = req.query;
      if (!user_id) {
        const response: ProxyResponse = {
          success: false,
          error: 'Invalid or missing user_id parameter'
        };
        res.status(400).json(response);
        return;
      }

      const customerId = user_id as string;
      const session = this.createSession();
      const customerData = await this.customerService.getCustomerById(session, customerId);

      if (!customerData) {
        const response: ProxyResponse = {
          success: false,
          error: 'Customer not found'
        };
        res.status(404).json(response);
        return;
      }

      const userProfile: UserProfile = {
        user_id: user_id as string,
        first_name: customerData.first_name,
        profile_image_url: customerData.profile_image_url,
        assigned_product: customerData.assigned_product as AssignedProduct
      };

      const response: ProxyResponse = {
        success: true,
        data: userProfile
      };

      res.json(response);

    } catch (error) {

      const response: ProxyResponse = {
        success: false,
        error: (error as Error).message
      };
      res.status(500).json(response);
    }
  }

  private createSession(): Session {
    return this.apiProvider.createSession();
  }

  /**
   * Validates Shopify proxy request signature (placeholder)
   * In production, implement proper signature verification
   */
  validateProxySignature(): boolean {
    // Placeholder for signature validation
    // In production, verify the request signature using Shopify's method
    return true;
  }
}
