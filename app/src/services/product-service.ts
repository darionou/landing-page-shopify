import { ShopifyApiProvider } from '../providers/shopify-api-provider';
import { Session } from '@shopify/shopify-api';
import {
  GET_PRODUCT_BY_ID
} from '../graphql';
import { toGraphQLId, toRestId } from '../utils/id-conversion.utils';

export interface ProductData {
  id: number;
  title: string;
  handle: string;
  price: string;
  image_url?: string | undefined;
  available: boolean;
}

export class ProductService {
  private apiProvider: ShopifyApiProvider;

  constructor(apiProvider: ShopifyApiProvider) {
    this.apiProvider = apiProvider;
  }

  async getProductById(
    session: Session,
    productId: number
  ): Promise<ProductData | null> {
    try {
      const graphqlId = toGraphQLId(productId, 'Product');

      const response = await this.apiProvider.makeGraphQLCall(
        session,
        GET_PRODUCT_BY_ID,
        { id: graphqlId },
        `get product ${productId}`
      );

      if (!response.product) {
        return null;
      }

      return this.transformGraphQLProductData(response.product);

    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return null; // Product not found
      }
      throw error;
    }
  }

  /**
   * Transforms GraphQL product data to our internal format
   */
  private transformGraphQLProductData(product: any): ProductData {
    const variant = product.variants?.edges?.[0]?.node;
    const image = product.images?.edges?.[0]?.node;

    return {
      id: toRestId(product.id),
      title: product.title || 'Untitled Product',
      handle: product.handle || '',
      price: variant?.price || '0.00',
      image_url: image?.url,
      available: product.status === 'ACTIVE' && (variant?.availableForSale ?? false)
    };
  }


  /**
   * Creates a new product using REST (more reliable for creation operations)
   */
  async createProduct(
    session: Session,
    productData: {
      title: string;
      handle: string;
      description: string;
      price: string;
      image_url?: string;
    }
  ): Promise<number> {
    const productPayload = {
      product: {
        title: productData.title,
        handle: productData.handle,
        body_html: productData.description,
        variants: [{
          price: productData.price,
          inventory_management: 'shopify',
          inventory_quantity: 100
        }],
        images: productData.image_url ? [{
          src: productData.image_url,
          alt: productData.title
        }] : []
      }
    };

    const response = await this.apiProvider.makeRestCall(
      session,
      'POST',
      'products',
      productPayload,
      'create product'
    );

    if (!response.product || !response.product.id) {
      throw new Error('Failed to create product: Invalid response');
    }

    return response.product.id;
  }
}
