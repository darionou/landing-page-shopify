/**
 * GraphQL operations index
 * Centralized export for all queries and mutations
 */

// Customer operations
export {
  GET_CUSTOMER_BY_ID
} from './queries/customer.queries';


// Product operations
export {
  GET_PRODUCT_BY_ID,
  GET_PRODUCTS,
  GET_DEFAULT_PRODUCT
} from './queries/product.queries';

// GraphQL utility types
export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: string[];
  }>;
  extensions?: any;
}

export interface GraphQLUserError {
  field: string[];
  message: string;
}

// Helper function to extract data from GraphQL response
export function extractGraphQLData(response: any): any {
  // If response already contains the data directly (from updated provider)
  if (response && typeof response === 'object' && !response.data && !response.errors) {
    return response;
  }

  // Handle traditional GraphQL response format
  if (response.errors && response.errors.length > 0) {
    throw new Error(`GraphQL Error: ${response.errors.map((e: any) => e.message).join(', ')}`);
  }

  if (!response.data) {
    throw new Error('No data returned from GraphQL query');
  }

  return response.data;
}

// Helper function to check for user errors in mutations
export function checkUserErrors(userErrors: GraphQLUserError[]): void {
  if (userErrors && userErrors.length > 0) {
    const errorMessages = userErrors.map(error => `${error.field.join('.')}: ${error.message}`);
    throw new Error(`Validation errors: ${errorMessages.join(', ')}`);
  }
}
