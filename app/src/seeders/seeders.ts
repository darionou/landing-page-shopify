import { ShopifyApiProvider } from '../providers/shopify-api-provider';
import { Session } from '@shopify/shopify-api';
import { CustomerService } from '../services/customer-service';
import { ProductService } from '../services/product-service';
import { ShopifyApiConfig } from '../types/shopify';

export interface CustomerSeedData {
  first_name: string;
  last_name: string;
  email: string;
  profile_image_url: string;
  assigned_product_id?: string;
}

export interface ProductSeedData {
  title: string;
  handle: string;
  description: string;
  price: string;
  image_url: string;
}

export interface SeederConfig {
  shop: string;
  accessToken: string;
  apiConfig: ShopifyApiConfig;
}

export class DataSeeder {
  private apiProvider: ShopifyApiProvider;
  private session: Session;
  private customerService: CustomerService;
  private productService: ProductService;

  constructor(config: SeederConfig) {
    this.apiProvider = ShopifyApiProvider.getInstance(config.apiConfig);
    this.session = this.apiProvider.createSession(config.shop, config.accessToken);
    this.productService = new ProductService(this.apiProvider);
    this.customerService = new CustomerService(this.apiProvider, this.productService);
  }

  async seedCustomers(customersData: CustomerSeedData[]): Promise<number[]> {
    const createdIds: number[] = [];
    for (const data of customersData) {
      const id = await this.createCustomer(data);
      createdIds.push(id);
    }
    return createdIds;
  }

  async createCustomer(data: CustomerSeedData): Promise<number> {
    try {
      // Create customer with metafields in a single call
      const customerId = await this.customerService.createCustomer(this.session, {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        profile_image_url: data.profile_image_url,
        assigned_product_id: data.assigned_product_id
      });

      console.log(`Created customer: ${data.first_name} ${data.last_name} (ID: ${customerId})`);
      return customerId;
    } catch (error) {
      if (error instanceof Error && error.message.includes('has already been taken')) {
        console.log(`Customer ${data.email} already exists, skipping...`);
        return -1;
      }
      throw error;
    }
  }


  async seedProducts(productsData: ProductSeedData[]): Promise<Map<string, number>> {
    const createdProductsMap = new Map<string, number>();
    for (const data of productsData) {
      const id = await this.createProduct(data);
      if (id > 0) {
        createdProductsMap.set(data.handle, id);
      }
    }
    return createdProductsMap;
  }

  async createProduct(data: ProductSeedData): Promise<number> {
    try {
      // Create product using ProductService
      const productId = await this.productService.createProduct(this.session, {
        title: data.title,
        handle: data.handle,
        description: data.description,
        price: data.price,
        image_url: data.image_url
      });

      console.log(`Created product: ${data.title} (ID: ${productId})`);
      return productId;
    } catch (error) {
      if (error instanceof Error && error.message.includes('has already been taken')) {
        console.log(`Product with handle "${data.handle}" already exists, skipping...`);
        return -1;
      }
      throw error;
    }
  }

  static getDefaultCustomers(): CustomerSeedData[] {
    return [
      {
        first_name: 'Alice',
        last_name: 'Johnson',
        email: 'alice.johnson@example.com',
        profile_image_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        assigned_product_id: 'premium-wireless-headphones'
      },
      {
        first_name: 'Bob',
        last_name: 'Smith',
        email: 'bob.smith@example.com',
        profile_image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        assigned_product_id: 'smart-fitness-watch'
      },
      {
        first_name: 'Charlie',
        last_name: 'Brown',
        email: 'charlie.brown@example.com',
        profile_image_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        assigned_product_id: 'premium-wireless-headphones'
      },
      {
        first_name: 'Charlie',
        last_name: 'Pollo',
        email: 'charlie.brown2@example.com',
        profile_image_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        assigned_product_id: 'smart-fitness-watch'
      },
      {
        first_name: 'Diana',
        last_name: 'Prince',
        email: 'diana.prince@example.com',
        profile_image_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150&h=150&fit=crop&crop=face'
      }
    ];
  }

  static getDefaultProducts(): ProductSeedData[] {
    return [
      {
        title: 'Premium Wireless Headphones',
        handle: 'premium-wireless-headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        price: '199.99',
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
      },
      {
        title: 'Smart Fitness Watch',
        handle: 'smart-fitness-watch',
        description: 'Advanced fitness tracking with heart rate monitor',
        price: '299.99',
        image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop'
      }
    ];
  }
}
