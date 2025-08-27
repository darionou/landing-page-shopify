# User Personalized Landing Page

A Shopify app that creates personalized landing pages based on user ID parameters in URLs.

## Project Structure

```
├── app/                    # Shopify App (Node.js/TypeScript)
│   ├── src/
│   │   ├── types/         # TypeScript type definitions
│   │   ├── services/      # Business logic services
│   │   ├── routes/        # Express route handlers
│   │   ├── utils/         # Utility functions
│   │   ├── seeders/       # Data seeding scripts
│   │   └── __tests__/     # Test files
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
└── theme/                 # Shopify Theme Components
    ├── sections/          # Liquid sections
    ├── snippets/          # Liquid snippets
    └── assets/            # JavaScript and CSS assets
```#
# Getting Started

1. Navigate to the app directory: `cd app`
2. Install dependencies: `npm install`
3. Copy environment variables: `cp .env.example .env`
4. Configure your Shopify app credentials in `.env`
5. Run development server: `npm run dev`

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run test` - Run test suite
- `npm run lint` - Run ESLint

## Requirements

This project implements the requirements defined in `.kiro/specs/user-personalized-landing/requirements.md`