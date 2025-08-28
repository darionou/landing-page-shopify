import { ShopifyApiProvider } from '../providers/shopify-api-provider';
import { Session } from '@shopify/shopify-api';
import {
  GET_CUSTOMER_BY_ID,
  GET_CUSTOMER_METAFIELDS,
  extractGraphQLData
} from '../graphql';
import { toGraphQLId, toRestId } from '../utils/id-conversion.utils';

export interface CustomerData {
  id: number;
  first_name: string;
  email: string;
  profile_image_url?: string | undefined;
  assigned_product_id?: number | undefined;
}

export interface CustomerMetafields {
  profile_image_url?: string;
  assigned_product_id?: string;
}

export class CustomerService {
  private apiProvider: ShopifyApiProvider;

  constructor(apiProvider?: ShopifyApiProvider) {
    this.apiProvider = apiProvider || ShopifyApiProvider.getInstance();
  }

  /**
   * Retrieves customer data by customer ID using GraphQL
   */
  async getCustomerById(
    session: Session,
    customerId: number
  ): Promise<CustomerData | null> {
    try {
      const graphqlId = toGraphQLId(customerId, 'Customer');

      const response = await this.apiProvider.makeGraphQLCall(
        session,
        GET_CUSTOMER_BY_ID,
        { id: graphqlId },
        `get customer ${customerId}`
      );

      const data = extractGraphQLData(response);

      if (!data.customer) {
        return null;
      }

      const customer = data.customer;

      // Extract metafields
      const metafields: { [key: string]: any } = {};
      if (customer.metafields?.edges) {
        customer.metafields.edges.forEach((edge: any) => {
          const metafield = edge.node;
          metafields[metafield.key] = metafield.value;
        });
      }

      return {
        id: toRestId(customer.id),
        first_name: customer.firstName || '',
        email: customer.email || '',
        profile_image_url: metafields['profile_image_url'],
        assigned_product_id: metafields['assigned_product_id'] ?
          parseInt(metafields['assigned_product_id'], 10) : undefined
      };

    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return null; // Customer not found
      }
      throw error;
    }
  }

  /**
   * Retrieves customer metafields for personalization using GraphQL
   */
  async getCustomerMetafields(
    session: Session,
    customerId: number
  ): Promise<CustomerMetafields> {
    try {
      const graphqlId = toGraphQLId(customerId, 'Customer');

      const response = await this.apiProvider.makeGraphQLCall(
        session,
        GET_CUSTOMER_METAFIELDS,
        {
          id: graphqlId,
          namespace: 'personalization'
        },
        `get customer ${customerId} metafields`
      );

      const data = extractGraphQLData(response);

      if (!data.customer?.metafields?.edges) {
        return {};
      }

      const result: CustomerMetafields = {};

      data.customer.metafields.edges.forEach((edge: any) => {
        const metafield = edge.node;
        if (metafield.key === 'profile_image_url') {
          result.profile_image_url = metafield.value;
        } else if (metafield.key === 'assigned_product_id') {
          result.assigned_product_id = metafield.value;
        }
      });

      return result;

    } catch (error) {
      // If metafields retrieval fails, return empty object rather than failing completely
      return {};
    }
  }

  /**
   * Validates customer ID format
   */
  validateCustomerId(customerId: any): boolean {
    return typeof customerId === 'number' &&
           customerId > 0 &&
           Number.isInteger(customerId);
  }


  /**
   * Creates a new customer using REST API
   */
  async createCustomer(
    session: Session,
    customerData: {
      first_name: string;
      last_name: string;
      email: string;
      metafields?: {
        profile_image_url?: string;
        assigned_product_id?: string;
      };
    }
  ): Promise<number> {
    const customerPayload: any = {
      customer: {
        first_name: customerData.first_name,
        last_name: customerData.last_name,
        email: customerData.email
      }
    };

    // Add metafields if provided
    if (customerData.metafields) {
      customerPayload.customer.metafields = [];

      if (customerData.metafields.profile_image_url) {
        customerPayload.customer.metafields.push({
          namespace: 'personalization',
          key: 'profile_image_url',
          value: customerData.metafields.profile_image_url,
          type: 'single_line_text_field'
        });
      }

      if (customerData.metafields.assigned_product_id) {
        customerPayload.customer.metafields.push({
          namespace: 'personalization',
          key: 'assigned_product_id',
          value: customerData.metafields.assigned_product_id,
          type: 'single_line_text_field'
        });
      }
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

  /**
   * Provides fallback data for missing customer information
   */
  getDefaultCustomerData(customerId: number): CustomerData {
    return {
      id: customerId,
      first_name: 'Valued Customer',
      email: '',
      profile_image_url: undefined,
      assigned_product_id: undefined
    };
  }
}
