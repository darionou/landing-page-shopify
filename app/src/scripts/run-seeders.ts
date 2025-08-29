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
  const productIds = await seeder.seedProducts(DataSeeder.getDefaultProducts());

  const validProductIds = productIds.filter(id => id > 0);

  if (validProductIds.length === 0) {
    throw new Error('No valid products were created. Cannot assign products to customers.');
  }

  const customersWithRealProducts = DataSeeder.getDefaultCustomers().map((customer, index) => {
    const productId = validProductIds[index % validProductIds.length];
    if (!productId) {
      throw new Error(`No product ID available for customer ${customer.first_name}`);
    }
    return {
      ...customer,
      assigned_product_id: productId.toString()
    };
  });

  const customerIds = await seeder.seedCustomers(customersWithRealProducts);


  return { customerIds, productIds };
}

if (require.main === module) {
  runSeeders().catch(console.error);
}

export { runSeeders };
