# User Personalized Landing Page

A Shopify app that creates personalized landing pages based on user ID parameters in URLs. The system fetches customer data and their assigned products from Shopify to display customized content.

## Project Architecture

```
├── app/                    # Backend API (Node.js/TypeScript)
│   ├── src/
│   │   ├── providers/     # Shopify API integration
│   │   ├── services/      # Business logic (Customer, Product)
│   │   ├── routes/        # Express route handlers
│   │   ├── seeders/       # Data migration scripts
│   │   ├── types/         # TypeScript definitions
│   │   ├── utils/         # Helper functions
│   │   └── __tests__/     # Unit tests
│   └── package.json
└── theme/                 # Frontend (Liquid template + local dev server)
    ├── templates/         # Shopify Liquid templates
    ├── local-server.js    # Development server
    └── package.json
```

## Quick Setup

### 1. Backend Setup

```bash
cd app
npm install
cp .env.example .env
```

Edit `app/.env` with your Shopify credentials:
```env
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_SHOP=your-shop.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_access_token_here
SHOPIFY_SCOPES=read_customers,read_products,read_customer_metafields,write_customers,write_products,write_customer_metafields
PORT=3001
```

Start the backend:
```bash
npm run dev
```

### 2. Frontend Setup

```bash
cd theme
npm install
npm run dev
```

The frontend development server runs on `http://localhost:3002`

### 3. Run Data Migration

Create sample customers and products:
```bash
cd app
npm run seed
```

This creates test customers with IDs that you can use to test the landing page.

## Environment Configuration

### Backend (.env file)
- `SHOPIFY_API_KEY` - Your Shopify app's API key
- `SHOPIFY_API_SECRET` - Your Shopify app's secret key
- `SHOPIFY_SHOP` - Your shop domain (e.g., myshop.myshopify.com)
- `SHOPIFY_ACCESS_TOKEN` - Private app access token
- `SHOPIFY_SCOPES` - Required API permissions
- `PORT` - Backend server port (default: 3001)

### Getting Shopify Credentials
1. Go to your Shopify admin panel
2. Navigate to Apps > App and sales channel settings
3. Create a private app or use existing app credentials
4. Copy the API key, secret, and access token to your .env file

## Testing the Landing Page

After running the seeder, you'll get customer IDs in the console output. Use these IDs to test:

```
http://localhost:3002?user_id=gid://shopify/Customer/CUSTOMER_ID
```

Example:
```
http://localhost:3002?user_id=gid://shopify/Customer/7408906436798
```

## Shopify API Integration

The app uses a comprehensive Shopify API provider that handles:

### Core Features
- **Singleton Pattern**: Ensures single API configuration instance
- **Session Management**: Creates and manages Shopify API sessions
- **Error Handling**: Comprehensive error handling with retry logic
- **Rate Limiting**: Built-in retry mechanism with exponential backoff
- **GraphQL & REST**: Support for both API types

### Customer Service
- Creates customers with custom metafields
- Retrieves customer data including profile images
- Manages customer-product assignments via metafields

### Product Service
- Creates products with images and descriptions
- Handles product variants and pricing
- Links products to customers through metafields

### Data Flow
1. Frontend requests user data via URL parameter
2. Theme calls backend proxy endpoint
3. Backend fetches customer data from Shopify
4. Backend retrieves assigned product information
5. Combined data returned to frontend for display

## Development Commands

### Backend (app/)
```bash
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm run start        # Run compiled JavaScript
npm run test         # Run Jest test suite
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run seed         # Run data migration/seeding
```

### Frontend (theme/)
```bash
npm run dev          # Start local development server
npm start            # Start local server (production mode)
```

## API Endpoints

### Backend (Port 3001)
- `GET /proxy/user-landing?user_id=ID` - Get personalized user data
- Health check and other endpoints as defined in routes

### Frontend Dev Server (Port 3002)
- `GET /` - Landing page template
- `GET /apps/personalized-landing/proxy/user-landing` - Proxy to backend
- `GET /api/health` - Development server health check

## Testing

Run the test suite:
```bash
cd app
npm test
```

Tests cover:
- Shopify API provider functionality
- Customer and product services
- Data seeding operations
- Proxy handler logic

## Production Deployment

1. Build the backend:
```bash
cd app
npm run build
```

2. Upload the Liquid template to your Shopify theme:
   - Copy `theme/templates/page.personalized-landing.liquid`
   - Upload to your theme's templates folder
   - Create a page using the "personalized-landing" template

3. Deploy the backend to your hosting platform with environment variables configured

4. Update the frontend proxy URL to point to your production backend

## Troubleshooting

### Common Issues
- **Invalid credentials**: Verify your .env file has correct Shopify credentials
- **Customer not found**: Run the seeder to create test customers
- **Port conflicts**: Change ports in package.json scripts if needed

