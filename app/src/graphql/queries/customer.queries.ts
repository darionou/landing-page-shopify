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

export const GET_CUSTOMER_METAFIELDS = `
  query getCustomerMetafields($id: ID!, $namespace: String!) {
    customer(id: $id) {
      id
      metafields(namespace: $namespace, first: 50) {
        edges {
          node {
            id
            key
            value
            type
            namespace
          }
        }
      }
    }
  }
`;

export const SEARCH_CUSTOMERS = `
  query searchCustomers($query: String!, $first: Int = 10) {
    customers(query: $query, first: $first) {
      edges {
        node {
          id
          firstName
          lastName
          email
          createdAt
        }
      }
    }
  }
`;
