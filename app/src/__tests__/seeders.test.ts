import { DataSeeder, CustomerSeedData, ProductSeedData, SeederConfig } from '../seeders/seeders';

// Mock the ShopifyApiProvider
jest.mock('../providers/shopify-api-provider', () => ({
  ShopifyApiProvider: {
    getInstance: jest.fn(() => ({
      createSession: jest.fn(() => ({ accessToken: 'test-token' })),
      createRestClient: jest.fn(() => ({
        post: jest.fn(() => Promise.resolve({
          body: { 
            customer: { id: 123 },
            product: { id: 456 },
            metafield: { id: 789 }
          }
        }))
      })),
      makeApiCall: jest.fn((fn) => fn())
    }))
  }
}));

describe('DataSeeder', () => {
  let seeder: DataSeeder;

  beforeEach(() => {
    const mockConfig: SeederConfig = {
      shop: 'test-shop.myshopify.com',
      accessToken: 'test-token',
      apiConfig: {
        apiKey: 'test-key',
        apiSecretKey: 'test-secret',
        scopes: ['read_customers', 'read_products'],
        hostName: 'test.localhost'
      }
    };
    seeder = new DataSeeder(mockConfig);
  });

  describe('Customer seeding', () => {
    const validCustomer: CustomerSeedData = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      profile_image_url: 'https://example.com/image.jpg',
      assigned_product_id: '123'
    };

    it('should create customer successfully', async () => {
      const customerId = await seeder.createCustomer(validCustomer);
      expect(customerId).toBe(123);
    });

    it('should reject invalid email', async () => {
      const invalidCustomer = { ...validCustomer, email: 'invalid' };
      await expect(seeder.createCustomer(invalidCustomer))
        .rejects.toThrow('Customer email must be valid');
    });

    it('should reject empty first_name', async () => {
      const invalidCustomer = { ...validCustomer, first_name: '' };
      await expect(seeder.createCustomer(invalidCustomer))
        .rejects.toThrow('Customer first_name is required');
    });

    it('should reject invalid URL', async () => {
      const invalidCustomer = { ...validCustomer, profile_image_url: 'not-a-url' };
      await expect(seeder.createCustomer(invalidCustomer))
        .rejects.toThrow('Customer profile_image_url must be a valid URL');
    });

    it('should reject invalid assigned_product_id', async () => {
      const invalidCustomer = { ...validCustomer, assigned_product_id: 'not-a-number' };
      await expect(seeder.createCustomer(invalidCustomer))
        .rejects.toThrow('Customer assigned_product_id must be a valid number');
    });
  });

  describe('Product seeding', () => {
    const validProduct: ProductSeedData = {
      title: 'Test Product',
      handle: 'test-product',
      description: 'A test product',
      price: '19.99',
      image_url: 'https://example.com/product.jpg'
    };

    it('should create product successfully', async () => {
      const productId = await seeder.createProduct(validProduct);
      expect(productId).toBe(456);
    });

    it('should reject empty title', async () => {
      const invalidProduct = { ...validProduct, title: '' };
      await expect(seeder.createProduct(invalidProduct))
        .rejects.toThrow('Product title is required');
    });

    it('should reject invalid price', async () => {
      const invalidProduct = { ...validProduct, price: 'not-a-number' };
      await expect(seeder.createProduct(invalidProduct))
        .rejects.toThrow('Product price must be a valid number');
    });

    it('should reject invalid image URL', async () => {
      const invalidProduct = { ...validProduct, image_url: 'not-a-url' };
      await expect(seeder.createProduct(invalidProduct))
        .rejects.toThrow('Product image_url must be a valid URL');
    });
  });

  describe('Batch seeding', () => {
    it('should seed multiple customers', async () => {
      const customers = DataSeeder.getDefaultCustomers();
      const customerIds = await seeder.seedCustomers(customers);
      
      expect(customerIds).toHaveLength(customers.length);
      expect(customerIds.every(id => typeof id === 'number')).toBe(true);
    });

    it('should seed multiple products', async () => {
      const products = DataSeeder.getDefaultProducts();
      const productIds = await seeder.seedProducts(products);
      
      expect(productIds).toHaveLength(products.length);
      expect(productIds.every(id => typeof id === 'number')).toBe(true);
    });
  });

  describe('Default data', () => {
    it('should provide default customers', () => {
      const customers = DataSeeder.getDefaultCustomers();
      expect(customers).toHaveLength(2);
      expect(customers[0]).toHaveProperty('first_name');
      expect(customers[0]).toHaveProperty('email');
    });

    it('should provide default products', () => {
      const products = DataSeeder.getDefaultProducts();
      expect(products).toHaveLength(2);
      expect(products[0]).toHaveProperty('title');
      expect(products[0]).toHaveProperty('price');
    });
  });
});