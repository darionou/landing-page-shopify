import { DataSeeder, CustomerSeedData, ProductSeedData } from '../seeders/seeders';

describe('DataSeeder', () => {
  let seeder: DataSeeder;

  beforeEach(() => {
    seeder = new DataSeeder();
  });

  describe('Customer validation', () => {
    const validCustomer: CustomerSeedData = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      profile_image_url: 'https://example.com/image.jpg',
      assigned_product_id: '123'
    };

    it('should validate valid customer data', () => {
      const result = seeder.validateCustomers([validCustomer]);
      expect(result).toEqual([validCustomer]);
    });

    it('should reject invalid email', () => {
      const invalidCustomer = { ...validCustomer, email: 'invalid' };
      expect(() => seeder.validateCustomers([invalidCustomer]))
        .toThrow('Customer email must be valid');
    });

    it('should reject empty first_name', () => {
      const invalidCustomer = { ...validCustomer, first_name: '' };
      expect(() => seeder.validateCustomers([invalidCustomer]))
        .toThrow('Customer first_name is required');
    });

    it('should reject invalid URL', () => {
      const invalidCustomer = { ...validCustomer, profile_image_url: 'not-a-url' };
      expect(() => seeder.validateCustomers([invalidCustomer]))
        .toThrow('Customer profile_image_url must be a valid URL');
    });

    it('should reject invalid product ID', () => {
      const invalidCustomer = { ...validCustomer, assigned_product_id: 'not-a-number' };
      expect(() => seeder.validateCustomers([invalidCustomer]))
        .toThrow('Customer assigned_product_id must be a valid number');
    });
  });

  describe('Product validation', () => {
    const validProduct: ProductSeedData = {
      title: 'Test Product',
      handle: 'test-product',
      description: 'A test product',
      price: '99.99',
      image_url: 'https://example.com/product.jpg'
    };

    it('should validate valid product data', () => {
      const result = seeder.validateProducts([validProduct]);
      expect(result).toEqual([validProduct]);
    });

    it('should reject invalid price', () => {
      const invalidProduct = { ...validProduct, price: 'invalid' };
      expect(() => seeder.validateProducts([invalidProduct]))
        .toThrow('Product price must be a valid number');
    });

    it('should reject empty title', () => {
      const invalidProduct = { ...validProduct, title: '' };
      expect(() => seeder.validateProducts([invalidProduct]))
        .toThrow('Product title is required');
    });

    it('should reject invalid image URL', () => {
      const invalidProduct = { ...validProduct, image_url: 'not-a-url' };
      expect(() => seeder.validateProducts([invalidProduct]))
        .toThrow('Product image_url must be a valid URL');
    });
  });

  describe('Default test data', () => {
    it('should provide valid default customers', () => {
      const customers = DataSeeder.getDefaultCustomers();
      expect(customers).toHaveLength(2);
      expect(customers[0]?.first_name).toBe('Alice');

      // Should validate without errors
      expect(() => seeder.validateCustomers(customers)).not.toThrow();
    });

    it('should provide valid default products', () => {
      const products = DataSeeder.getDefaultProducts();
      expect(products).toHaveLength(2);
      expect(products[0]?.title).toBe('Premium Wireless Headphones');

      // Should validate without errors
      expect(() => seeder.validateProducts(products)).not.toThrow();
    });
  });
});
