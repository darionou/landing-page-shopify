/**
 * GraphQL queries for customer operations
 */

export const GET_CUSTOMER_BY_ID = `
  query getCustomer($id: ID!) {
    customer(id: $id) {
      id
      firstName
      lastName
      email
      createdAt
      updatedAt
      metafields(namespace: "personalization", first: 10) {
        edges {
          node {
            id
            key
            value
            type
          }
        }
      }
    }
  }
`;
