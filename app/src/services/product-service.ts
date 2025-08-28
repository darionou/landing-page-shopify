import { ShopifyApiProvider } from '../providers/shopify-api-provider';
import { Session } from '@shopify/shopify-api';
import { AssignedProduct } from '../types';
import {
  GET_PRODUCT_BY_ID,
  GET_DEFAULT_PRODUCT,
  extractGraphQLData
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

  constructor(apiProvider?: ShopifyApiProvider) {
    this.apiProvider = apiProvider || ShopifyApiProvider.getInstance();
  }

  /**
   * Retrieves product data by product ID using GraphQL
   */
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

      const data = extractGraphQLData(response);

      if (!data.product) {
        return null;
      }

      return this.transformGraphQLProductData(data.product);

    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return null; // Product not found
      }
      throw error;
    }
  }

  /**
   * Retrieves assigned product for a customer using their assigned product ID
   */
  async getAssignedProduct(
    session: Session,
    assignedProductId: number
  ): Promise<AssignedProduct | null> {
    const productData = await this.getProductById(session, assignedProductId);

    if (!productData) {
      return null;
    }

    return {
      id: productData.id,
      title: productData.title,
      image_url: productData.image_url || '',
      price: productData.price,
      handle: productData.handle
    };
  }

  /**
   * Gets a default/featured product when no specific product is assigned using GraphQL
   */
  async getDefaultProduct(session: Session): Promise<AssignedProduct | null> {
    try {
      const response = await this.apiProvider.makeGraphQLCall(
        session,
        GET_DEFAULT_PRODUCT,
        {},
        'get default product'
      );

      const data = extractGraphQLData(response);

      if (!data.products?.edges || data.products.edges.length === 0) {
        return null;
      }

      const productEdge = data.products.edges[0];
      const product = productEdge.node;
      const transformedProduct = this.transformGraphQLProductData(product);

      return {
        id: transformedProduct.id,
        title: transformedProduct.title,
        image_url: transformedProduct.image_url || '',
        price: transformedProduct.price,
        handle: transformedProduct.handle
      };

    } catch (error) {
      
      return null;
    }
  }

  /**
   * Validates product ID format
   */
  validateProductId(productId: any): boolean {
    return typeof productId === 'number' &&
           productId > 0 &&
           Number.isInteger(productId);
  }

  /**
   * Checks if a product is available for purchase
   */
  async isProductAvailable(
    session: Session,
    productId: number
  ): Promise<boolean> {
    try {
      const productData = await this.getProductById(session, productId);
      return productData?.available || false;
    } catch (error) {

      return false;
    }
  }

  /**
   * Gets multiple products by their IDs
   */
  async getProductsByIds(
    session: Session,
    productIds: number[]
  ): Promise<ProductData[]> {
    const products: ProductData[] = [];

    for (const productId of productIds) {
      try {
        const product = await this.getProductById(session, productId);
        if (product) {
          products.push(product);
        }
      } catch (error) {

        // Continue with other products
      }
    }

    return products;
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

  /**
   * Provides fallback product data
   */
  getDefaultProductData(): AssignedProduct {
    return {
      id: 0,
      title: 'Featured Product',
      image_url: '',
      price: '0.00',
      handle: 'featured-product'
    };
  }
}
