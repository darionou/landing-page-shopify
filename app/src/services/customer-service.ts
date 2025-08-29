import { ShopifyApiProvider } from '../providers/shopify-api-provider';
import { Session } from '@shopify/shopify-api';
import {
  GET_CUSTOMER_BY_ID
} from '../graphql';
import { ProductService, ProductData } from './product-service';

export interface CustomerData {
  id: string;
  first_name: string;
  email: string;
  profile_image_url?: string | undefined;
  assigned_product_id?: number | undefined;
  assigned_product?: ProductData | undefined;
}

export interface CreateCustomerRequest {
  first_name: string;
  last_name: string;
  email: string;
  assigned_product_id?: string;
  profile_image_url?: string;
}

export interface CustomerMetafields {
  profile_image_url?: string;
  assigned_product_id?: string;
}

export class CustomerService {
  private apiProvider: ShopifyApiProvider;
  private productService: ProductService;

  constructor(apiProvider: ShopifyApiProvider, productService: ProductService) {
    this.apiProvider = apiProvider;
    this.productService = productService;
  }


  async getCustomerById(
    session: Session,
    customerId: string
  ): Promise<CustomerData | null> {
    const response = await this.apiProvider.makeGraphQLCall(
      session,
      GET_CUSTOMER_BY_ID,
      { id: customerId },
      `get customer ${customerId}`
    );

    if (!response.customer) {
      return null;
    }

    const customer = response.customer;

    const metafields: { [key: string]: any } = {};
    if (customer.metafields?.edges) {
      customer.metafields.edges.forEach((edge: any) => {
        const metafield = edge.node;
        metafields[metafield.key] = metafield.value;
      });
    }

    const assignedProductId = metafields['assigned_product_id'] ?
      parseInt(metafields['assigned_product_id'], 10) : undefined;

    let assignedProduct: ProductData | undefined;
    if (assignedProductId) {
      const productData = await this.productService.getProductById(session, assignedProductId);
      assignedProduct = productData || undefined;
    }

    return {
      id: customerId,
      first_name: customer.firstName || '',
      email: customer.email || '',
      profile_image_url: metafields['profile_image_url'],
      assigned_product_id: assignedProductId,
      assigned_product: assignedProduct
    };
  }

  /**
   * Creates a new customer using REST API
   */
  async createCustomer(
    session: Session,
    customerData: CreateCustomerRequest
  ): Promise<number> {
    const customerPayload: any = {
      customer: {
        first_name: customerData.first_name,
        last_name: customerData.last_name,
        email: customerData.email,
        metafields: []
      }
    };


    if (customerData.profile_image_url) {
      customerPayload.customer.metafields.push({
        namespace: 'personalization',
        key: 'profile_image_url',
        value: customerData.profile_image_url,
        type: 'single_line_text_field'
      });
    }

    if(customerData.assigned_product_id) {
      customerPayload.customer.metafields.push({
        namespace: 'personalization',
        key: 'assigned_product_id',
        value: customerData.assigned_product_id,
        type: 'single_line_text_field'
      });
    }

    const response = await this.apiProvider.makeRestCall(
      session,
      'POST',
      'customers',
      customerPayload,
      'create customer'
    );

    if (!response.customer || !response.customer.id) {
      throw new Error('Failed to create customer: Invalid response');
    }

    return response.customer.id;
  }
}
