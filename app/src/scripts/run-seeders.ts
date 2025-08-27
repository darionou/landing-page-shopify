#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { DataSeeder, SeederConfig } from '../seeders';

dotenv.config();

async function runSeeders() {
  const config: SeederConfig = {
    shop: process.env['SHOPIFY_SHOP'] || 'test-shop.myshopify.com',
    accessToken: process.env['SHOPIFY_ACCESS_TOKEN'] || 'test-token',
    apiConfig: {
      apiKey: process.env['SHOPIFY_API_KEY'] || '',
      apiSecretKey: process.env['SHOPIFY_API_SECRET'] || '',
      scopes: (process.env['SHOPIFY_SCOPES'] || '').split(','),
      hostName: process.env['SHOPIFY_APP_URL'] || 'localhost'
    }
  };

  const seeder = new DataSeeder(config);

  const customerIds = await seeder.seedCustomers(DataSeeder.getDefaultCustomers());
  const productIds = await seeder.seedProducts(DataSeeder.getDefaultProducts());

  return { customerIds, productIds };
}

if (require.main === module) {
  runSeeders().catch(console.error);
}

export { runSeeders };
