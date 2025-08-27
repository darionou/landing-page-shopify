import { ShopifyApiClient, ShopifyApiError } from './shopify-api-client';
import { Session } from '@shopify/shopify-api';
import { ShopifyCustomer, ShopifyMetafield } from '../types';

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
  private apiClient: ShopifyApiClient;

  constructor(apiClient: ShopifyApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Retrieves customer data by customer ID
   */
  async getCustomerById(
    session: Session,
    customerId: number
  ): Promise<CustomerData | null> {
    try {
      const restClient = this.apiClient.createRestClient(session);

      const customerResponse = await this.apiClient.makeApiCall(
        async () => {
          return await restClient.get({
            path: `customers/${customerId}`
          });
        },
        `get customer ${customerId}`
      );

      this.apiClient.validateResponse(customerResponse, `get customer ${customerId}`);

      if (!customerResponse.body?.customer) {
        return null;
      }

      const customer: ShopifyCustomer = customerResponse.body.customer;

      // Get customer metafields for personalization data
      const metafields = await this.getCustomerMetafields(session, customerId);

      return {
        id: customer.id,
        first_name: customer.first_name || '',
        email: customer.email || '',
        profile_image_url: metafields.profile_image_url,
        assigned_product_id: metafields.assigned_product_id ?
          parseInt(metafields.assigned_product_id, 10) : undefined
      };

    } catch (error) {
      if (error instanceof ShopifyApiError && error.statusCode === 404) {
        return null; // Customer not found
      }
      throw error;
    }
  }

  /**
   * Retrieves customer metafields for personalization
   */
  async getCustomerMetafields(
    session: Session,
    customerId: number
  ): Promise<CustomerMetafields> {
    try {
      const restClient = this.apiClient.createRestClient(session);

      const metafieldsResponse = await this.apiClient.makeApiCall(
        async () => {
          return await restClient.get({
            path: `customers/${customerId}/metafields`,
            query: {
              namespace: 'personalization'
            }
          });
        },
        `get customer ${customerId} metafields`
      );

      this.apiClient.validateResponse(metafieldsResponse, `get customer ${customerId} metafields`);

      const metafields: ShopifyMetafield[] = metafieldsResponse.body?.metafields || [];

      return this.parseMetafields(metafields);

    } catch (error) {
      // If metafields retrieval fails, return empty object rather than failing completely
      console.warn(`Failed to retrieve metafields for customer ${customerId}:`, error);
      return {};
    }
  }

  /**
   * Updates customer metafields for personalization
   */
  async updateCustomerMetafields(
    session: Session,
    customerId: number,
    metafields: Partial<CustomerMetafields>
  ): Promise<void> {
    const restClient = this.apiClient.createRestClient(session);

    for (const [key, value] of Object.entries(metafields)) {
      if (value !== undefined) {
        await this.apiClient.makeApiCall(
          async () => {
            return await restClient.post({
              path: `customers/${customerId}/metafields`,
              data: {
                metafield: {
                  namespace: 'personalization',
                  key: key,
                  value: value.toString(),
                  type: 'single_line_text_field'
                }
              }
            });
          },
          `update customer ${customerId} metafield ${key}`
        );
      }
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
   * Parses metafields array into structured object
   */
  private parseMetafields(metafields: ShopifyMetafield[]): CustomerMetafields {
    const result: CustomerMetafields = {};

    for (const metafield of metafields) {
      if (metafield.namespace === 'personalization') {
        switch (metafield.key) {
          case 'profile_image_url':
            result.profile_image_url = metafield.value;
            break;
          case 'assigned_product_id':
            result.assigned_product_id = metafield.value;
            break;
        }
      }
    }

    return result;
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
