/**
 * Utilities for handling ID conversions between REST and GraphQL
 */

/**
 * Converts a REST ID to GraphQL Global ID
 * @param restId - The REST ID (number or string)
 * @param resourceType - The resource type (Customer, Product, etc.)
 * @returns GraphQL Global ID string
 */
export function toGraphQLId(restId: number | string, resourceType: string): string {
  return `gid://shopify/${resourceType}/${restId}`;
}

/**
 * Converts a GraphQL Global ID to REST ID
 * @param graphqlId - The GraphQL Global ID string
 * @returns REST ID as number
 */
export function toRestId(graphqlId: string): number {
  const parts = graphqlId.split('/');
  const id = parts[parts.length - 1];
  if (!id) {
    throw new Error(`Invalid GraphQL ID format: ${graphqlId}`);
  }
  return parseInt(id, 10);
}