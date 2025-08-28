/**
 * GraphQL queries for product operations
 */

export const GET_PRODUCT_BY_ID = `
  query getProduct($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      description
      status
      createdAt
      updatedAt
      variants(first: 1) {
        edges {
          node {
            id
            price
            availableForSale
          }
        }
      }
      images(first: 1) {
        edges {
          node {
            id
            url
            altText
          }
        }
      }
    }
  }
`;

export const GET_PRODUCTS = `
  query getProducts($first: Int = 10, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          handle
          status
          variants(first: 1) {
            edges {
              node {
                id
                price
                availableForSale
              }
            }
          }
          images(first: 1) {
            edges {
              node {
                id
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_DEFAULT_PRODUCT = `
  query getDefaultProduct {
    products(first: 1, query: "status:active") {
      edges {
        node {
          id
          title
          handle
          variants(first: 1) {
            edges {
              node {
                id
                price
                availableForSale
              }
            }
          }
          images(first: 1) {
            edges {
              node {
                id
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`;