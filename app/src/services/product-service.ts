import { ShopifyApiClient, ShopifyApiError } from './shopify-api-client';
import { Session } from '@shopify/shopify-api';
import { ShopifyProduct, AssignedProduct } from '../types';

export interface ProductData {
  id: number;
  title: string;
  handle: string;
  price: string;
  image_url?: string | undefined;
  available: boolean;
}

export class ProductService {
  private apiClient: ShopifyApiClient;

  constructor(apiClient: ShopifyApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Retrieves product data by product ID
   */
  async getProductById(
    session: Session,
    productId: number
  ): Promise<ProductData | null> {
    try {
      const restClient = this.apiClient.createRestClient(session);

      const productResponse = await this.apiClient.makeApiCall(
        async () => {
          return await restClient.get({
            path: `products/${productId}`
          });
        },
        `get product ${productId}`
      );

      this.apiClient.validateResponse(productResponse, `get product ${productId}`);

      if (!productResponse.body?.product) {
        return null;
      }

      const product: ShopifyProduct = productResponse.body.product;

      return this.transformProductData(product);

    } catch (error) {
      if (error instanceof ShopifyApiError && error.statusCode === 404) {
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
   * Gets a default/featured product when no specific product is assigned
   */
  async getDefaultProduct(session: Session): Promise<AssignedProduct | null> {
    try {
      const restClient = this.apiClient.createRestClient(session);

      const productsResponse = await this.apiClient.makeApiCall(
        async () => {
          return await restClient.get({
            path: 'products',
            query: {
              limit: 1,
              status: 'active'
            }
          });
        },
        'get default product'
      );

      this.apiClient.validateResponse(productsResponse, 'get default product');

      const products: ShopifyProduct[] = productsResponse.body?.products || [];

      if (products.length === 0) {
        return null;
      }

      const firstProduct = products[0];
      if (!firstProduct) {
        return null;
      }

      const product = this.transformProductData(firstProduct);

      return {
        id: product.id,
        title: product.title,
        image_url: product.image_url || '',
        price: product.price,
        handle: product.handle
      };

    } catch (error) {
      console.warn('Failed to retrieve default product:', error);
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
      console.warn(`Failed to check availability for product ${productId}:`, error);
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
        console.warn(`Failed to retrieve product ${productId}:`, error);
        // Continue with other products
      }
    }

    return products;
  }

  /**
   * Transforms Shopify product data to our internal format
   */
  private transformProductData(product: ShopifyProduct): ProductData {
    // Get the first variant's price, or default to '0.00'
    const price = product.variants && product.variants.length > 0 && product.variants[0]
      ? product.variants[0].price
      : '0.00';

    // Get the first image URL, or undefined if no images
    const image_url = product.images && product.images.length > 0 && product.images[0]
      ? product.images[0].src
      : undefined;

    // Check if product has available variants
    const available = product.variants && product.variants.length > 0;

    return {
      id: product.id,
      title: product.title || 'Untitled Product',
      handle: product.handle || '',
      price: price,
      image_url: image_url,
      available: available
    };
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
