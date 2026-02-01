
export async function getBundleConfig(graphql, key = "config") {
  const response = await graphql(`#graphql
    query GetBundleConfig($key: String!) {
      shop {
        metafield(namespace: "bundle_builder", key: $key) {
          value
        }
      }
    }
  `, {
    variables: { key }
  });

  const responseJson = await response.json();
  const value = responseJson.data?.shop?.metafield?.value;
  return value ? JSON.parse(value) : null;
}

export async function setBundleConfig(admin, config, key = "config") {
  const shopQuery = await admin.graphql(`#graphql
    query GetShopId {
      shop {
        id
      }
    }
  `);
  const shopData = await shopQuery.json();
  const shopId = shopData.data.shop.id;

  const response = await admin.graphql(`#graphql
    mutation SetBundleConfig($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      metafields: [
        {
          ownerId: shopId,
          namespace: "bundle_builder",
          key: key,
          type: "json",
          value: JSON.stringify(config)
        }
      ]
    }
  });

  const responseJson = await response.json();
  return !responseJson.data?.metafieldsSet?.userErrors?.length;
}

export async function createBundleDiscount(admin, tier, prefix = "fubndl") {
  console.log(`UTILS: createBundleDiscount started for ${prefix}`, JSON.stringify(tier));
  const { count, percentage } = tier;
  const code = `${prefix}-${percentage}`;
  const title = `${percentage}% off when you buy ${count}+ items`;

  try {
    // 1. Check if discount already exists to get its ID
    const checkQuery = `code:${code}`;
    console.log(`UTILS: Searching for discount with query: ${checkQuery}`);
    
    const checkResponse = await admin.graphql(`#graphql
      query checkDiscount($query: String!) {
        codeDiscountNodes(first: 10, query: $query) {
          nodes {
            id
            codeDiscount {
              __typename
              ... on DiscountCodeBasic {
                codes(first: 1) {
                  nodes {
                    code
                  }
                }
              }
              ... on DiscountCodeBxgy {
                codes(first: 1) {
                  nodes {
                    code
                  }
                }
              }
              ... on DiscountCodeFreeShipping {
                codes(first: 1) {
                  nodes {
                    code
                  }
                }
              }
            }
          }
        }
      }
    `, {
      variables: { query: checkQuery }
    });

    const checkJson = await checkResponse.json();
    
    if (checkJson.errors) {
      console.error("UTILS: GraphQL errors during check:", JSON.stringify(checkJson.errors));
      return { success: false, error: "GraphQL check error: " + checkJson.errors[0]?.message };
    }

    const nodes = checkJson.data?.codeDiscountNodes?.nodes || [];
    const existingNode = nodes.find(node => {
      const foundCode = node.codeDiscount?.codes?.nodes?.[0]?.code;
      return foundCode?.toLowerCase() === code.toLowerCase();
    });
    
    // Ensure we only update if it's actually a Basic discount
    const canUpdate = existingNode && existingNode.codeDiscount?.__typename === 'DiscountCodeBasic';

    if (existingNode && !canUpdate) {
        console.warn(`UTILS: Found discount ${code} but it is type ${existingNode.codeDiscount?.__typename}, cannot update.`);
        return { success: false, error: `Code ${code} is used by a ${existingNode.codeDiscount?.__typename} discount. Please delete it first.` };
    }

    const discountInput = {
      title: title,
      startsAt: new Date(Date.now() - 60000).toISOString().split('.')[0] + "Z", // No milliseconds
      customerGets: {
        items: {
          all: true
        },
        value: {
          percentage: parseFloat((percentage / 100).toFixed(2))
        }
      },
      minimumRequirement: {
        quantity: {
          greaterThanOrEqualToQuantity: String(count)
        }
      },
      customerSelection: {
        all: true
      },
      appliesOncePerCustomer: false,
      combinesWith: {
        orderDiscounts: false,
        productDiscounts: false,
        shippingDiscounts: false
      }
    };

    let response;
    let operationName = "";

    if (canUpdate) {
      operationName = "discountCodeBasicUpdate";
      console.log(`UTILS: Updating existing basic discount ${existingNode.id} for ${code}`);
      response = await admin.graphql(`#graphql
        mutation discountCodeBasicUpdate($id: ID!, $basicCodeDiscount: DiscountCodeBasicInput!) {
          discountCodeBasicUpdate(id: $id, basicCodeDiscount: $basicCodeDiscount) {
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          id: existingNode.id,
          basicCodeDiscount: discountInput
        }
      });
    } else {
      operationName = "discountCodeBasicCreate";
      console.log(`UTILS: Creating new basic discount for ${code}`);
      discountInput.code = code;
      response = await admin.graphql(`#graphql
        mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
          discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
            codeDiscountNode {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          basicCodeDiscount: discountInput
        }
      });
    }

    const responseJson = await response.json();
    console.log(`UTILS: ${operationName} response:`, JSON.stringify(responseJson));
    
    if (responseJson.errors) {
      return { success: false, error: responseJson.errors[0]?.message || "GraphQL mutation error" };
    }
    
    const errors = responseJson.data?.[operationName]?.userErrors || [];
    
    if (errors.length > 0) {
      const errMsg = errors.map(e => `${e.field}: ${e.message}`).join(", ");
      console.error(`UTILS: User errors for ${code}:`, errMsg);
      return { success: false, error: errMsg };
    }

    console.log(`UTILS: Discount ${code} processed successfully`);
    return { success: true };
  } catch (err) {
    console.error(`UTILS: Fatal error processing discount ${code}:`, err);
    return { success: false, error: err.message || "Fatal error" };
  }
}

export async function deleteBundleDiscount(admin, code) {
  console.log(`UTILS: deleteBundleDiscount started for code: "${code}"`);
  try {
    // Try both specific code query and general query
    const queries = [`code:${code}`, code];
    let nodes = [];

    for (const q of queries) {
      console.log(`UTILS: Searching with query: "${q}"`);
      const checkResponse = await admin.graphql(`#graphql
        query checkDiscount($query: String!) {
          codeDiscountNodes(first: 20, query: $query) {
            nodes {
              id
              codeDiscount {
                __typename
                ... on DiscountCodeBasic {
                  codes(first: 1) {
                    nodes {
                      code
                    }
                  }
                }
                ... on DiscountCodeBxgy {
                  codes(first: 1) {
                    nodes {
                      code
                    }
                  }
                }
                ... on DiscountCodeFreeShipping {
                  codes(first: 1) {
                    nodes {
                      code
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        variables: { query: q }
      });

      const checkJson = await checkResponse.json();
      const currentNodes = checkJson.data?.codeDiscountNodes?.nodes || [];
      nodes = [...nodes, ...currentNodes];
      
      // If we found a direct match, we can stop
      const match = currentNodes.find(node => {
        const foundCode = node.codeDiscount?.codes?.nodes?.[0]?.code;
        return foundCode?.toLowerCase() === code.toLowerCase();
      });
      if (match) break;
    }

    console.log(`UTILS: Total potential nodes found: ${nodes.length}`);

    // Deduplicate nodes by ID
    const uniqueNodes = Array.from(new Map(nodes.map(node => [node.id, node])).values());

    const existingNode = uniqueNodes.find(node => {
      const foundCode = node.codeDiscount?.codes?.nodes?.[0]?.code;
      const isMatch = foundCode?.toLowerCase() === code.toLowerCase();
      if (isMatch) console.log(`UTILS: Exact match found! Node ID: ${node.id}, Type: ${node.codeDiscount?.__typename}`);
      return isMatch;
    });

    if (existingNode) {
      console.log(`UTILS: Executing deletion for discount "${code}" (${existingNode.id})`);
      const deleteResponse = await admin.graphql(`#graphql
        mutation discountCodeDelete($id: ID!) {
          discountCodeDelete(id: $id) {
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: { id: existingNode.id }
      });

      const deleteJson = await deleteResponse.json();
      console.log(`UTILS: Delete mutation response for "${code}":`, JSON.stringify(deleteJson));

      if (deleteJson.data?.discountCodeDelete?.userErrors?.length) {
        console.error(`UTILS: Delete errors for "${code}":`, deleteJson.data.discountCodeDelete.userErrors);
        return { success: false, error: deleteJson.data.discountCodeDelete.userErrors[0].message };
      }
      console.log(`UTILS: Successfully deleted discount "${code}"`);
      return { success: true };
    }
    
    console.log(`UTILS: No exact match found for "${code}" among ${uniqueNodes.length} nodes, skipping delete.`);
    return { success: true };
  } catch (err) {
    console.error(`UTILS: Fatal error deleting discount "${code}":`, err);
    return { success: false, error: err.message || "Fatal error" };
  }
}
