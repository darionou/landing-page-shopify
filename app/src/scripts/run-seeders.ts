#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { DataSeeder, SeederConfig } from '../seeders';

dotenv.config();

async function runSeeders() {
  const config: SeederConfig = {
    shop: process.env['SHOPIFY_SHOP'] || '',
    accessToken: process.env['SHOPIFY_ACCESS_TOKEN'] || '',
    apiConfig: {
      apiKey: process.env['SHOPIFY_API_KEY'] || '',
      apiSecretKey: process.env['SHOPIFY_API_SECRET'] || '',
      scopes: (process.env['SHOPIFY_SCOPES'] || '').split(','),
      hostName: process.env['SHOPIFY_APP_URL'] || 'localhost'
    }
  };

  const seeder = new DataSeeder(config);

  console.log('Creating products...');
  const productMap = await seeder.seedProducts(DataSeeder.getDefaultProducts());

  if (productMap.size === 0) {
    console.warn('No new products were created (they might exist already). Customers will be seeded without product assignments if handles are not found.');
  }

  const customersWithRealProducts = DataSeeder.getDefaultCustomers().map(customer => {
    // Skip product assignment if the customer has no assigned_product_id
    if (!customer.assigned_product_id) {
      return customer;
    }

    const productId = productMap.get(customer.assigned_product_id);

    if (!productId) {
      console.warn(`Product with handle '${customer.assigned_product_id}' not found for customer ${customer.first_name}. Skipping product assignment.`);
      return {
        ...customer,
        assigned_product_id: '' // Clear the handle if it's invalid
      };
    }

    return {
      ...customer,
      assigned_product_id: productId.toString() // Overwrite the handle with the real product ID
    };
  });

  console.log('Creating customers...');
  const customerIds = await seeder.seedCustomers(customersWithRealProducts);

  const productIds = Array.from(productMap.values());
  return { customerIds, productIds };
}

if (require.main === module) {
  runSeeders().catch(console.error);
}

export { runSeeders };
