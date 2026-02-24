
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


export async function findDiscountByCode(admin, code) {
  console.log(`UTILS: findDiscountByCode searching for: "${code}"`);
  const queries = [`code:${code}`, code];
  let allNodes = [];

  for (const q of queries) {
    try {
      const checkResponse = await admin.graphql(`#graphql
        query checkDiscount($query: String!) {
          codeDiscountNodes(first: 20, query: $query) {
            nodes {
              id
              codeDiscount {
                __typename
                ... on DiscountCodeBasic {
                  codes(first: 1) { nodes { code } }
                }
                ... on DiscountCodeBxgy {
                  codes(first: 1) { nodes { code } }
                }
                ... on DiscountCodeFreeShipping {
                  codes(first: 1) { nodes { code } }
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
      
      const match = currentNodes.find(node => {
        const foundCode = node.codeDiscount?.codes?.nodes?.[0]?.code;
        return foundCode?.toLowerCase() === code.toLowerCase();
      });
      
      if (match) {
        console.log(`UTILS: Match found for "${code}" with query "${q}"`);
        return match;
      }
      allNodes = [...allNodes, ...currentNodes];
    } catch (e) {
      console.error(`UTILS: Error in findDiscountByCode with query "${q}":`, e);
    }
  }

  const uniqueNodes = Array.from(new Map(allNodes.map(node => [node.id, node])).values());
  const finalMatch = uniqueNodes.find(node => {
    const foundCode = node.codeDiscount?.codes?.nodes?.[0]?.code;
    return foundCode?.toLowerCase() === code.toLowerCase();
  });

  if (finalMatch) {
    console.log(`UTILS: Final match found for "${code}" after deduplication`);
  } else {
    console.log(`UTILS: No match found for "${code}"`);
  }
  return finalMatch;
}

export async function createBundleDiscount(admin, tier, prefix = "fubndl") {
  console.log(`UTILS: createBundleDiscount started for ${prefix}`, JSON.stringify(tier));
  const { count, percentage } = tier;
  const code = `${prefix}-${percentage}`;
  const title = `${percentage}% off when you buy ${count}+ items`;

  try {
    // 1. Check if discount already exists to get its ID
    let existingNode = await findDiscountByCode(admin, code);
    
    // Ensure we only update if it's actually a Basic discount
    let canUpdate = existingNode && existingNode.codeDiscount?.__typename === 'DiscountCodeBasic';

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
    
    let errors = responseJson.data?.[operationName]?.userErrors || [];
    
    // FALLBACK: If creation failed because code is not unique, try to find it again and update
    if (operationName === "discountCodeBasicCreate" && errors.some(e => e.message.includes("unique") || e.message.includes("taken"))) {
      console.log(`UTILS: Code ${code} was not unique during create, attempting fallback update...`);
      const retryNode = await findDiscountByCode(admin, code);
      if (retryNode && retryNode.codeDiscount?.__typename === 'DiscountCodeBasic') {
        console.log(`UTILS: Found node ${retryNode.id} during fallback, updating instead.`);
        const retryResponse = await admin.graphql(`#graphql
          mutation discountCodeBasicUpdate($id: ID!, $basicCodeDiscount: DiscountCodeBasicInput!) {
            discountCodeBasicUpdate(id: $id, basicCodeDiscount: $basicCodeDiscount) {
              userErrors { field message }
            }
          }
        `, {
          variables: {
            id: retryNode.id,
            basicCodeDiscount: discountInput
          }
        });
        const retryJson = await retryResponse.json();
        errors = retryJson.data?.discountCodeBasicUpdate?.userErrors || [];
      }
    }
    
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
    const existingNode = await findDiscountByCode(admin, code);

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

export async function createBXGYDiscount(admin, config, prefix = "fubxgy") {
  console.log("UTILS: createBXGYDiscount config:", JSON.stringify(config));
  const { buyCount, buyProducts, getCount, getProducts, discountType, discountValue } = config;
  const code = `${prefix}-${discountType}-${discountValue}`;
  const title = `Buy ${buyCount} get ${getCount} ${discountType === 'free' ? 'FREE' : discountValue + '% off'}`;

  try {
    let existingNode = await findDiscountByCode(admin, code);

    const discountInput = {
      title: title,
      startsAt: new Date(Date.now() - 60000).toISOString().split('.')[0] + "Z",
      customerBuys: {
        value: {
          quantity: String(buyCount)
        },
        items: {
          products: {
            productsToAdd: buyProducts.map(p => p.id)
          }
        }
      },
      customerGets: {
        value: {
          discountOnQuantity: {
            quantity: String(getCount),
            effect: {
              percentage: discountType === 'free' ? 1.0 : parseFloat((discountValue / 100).toFixed(2))
            }
          }
        },
        items: {
          products: {
            productsToAdd: getProducts.map(p => p.id)
          }
        }
      },
      customerSelection: {
        all: true
      },
      appliesOncePerCustomer: false,
      combinesWith: {
        orderDiscounts: false,
        productDiscounts: true,
        shippingDiscounts: true
      }
    };

    console.log("UTILS: BXGY Mutation Input:", JSON.stringify(discountInput));

    let response;
    let operationName = "";

    if (existingNode) {
      operationName = "discountCodeBxgyUpdate";
      console.log("UTILS: Updating BXGY discount", existingNode.id);
      response = await admin.graphql(`#graphql
        mutation discountCodeBxgyUpdate($id: ID!, $bxgyCodeDiscount: DiscountCodeBxgyInput!) {
          discountCodeBxgyUpdate(id: $id, bxgyCodeDiscount: $bxgyCodeDiscount) {
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: { id: existingNode.id, bxgyCodeDiscount: discountInput }
      });
    } else {
      operationName = "discountCodeBxgyCreate";
      discountInput.code = code;
      console.log("UTILS: Creating BXGY discount", code);
      response = await admin.graphql(`#graphql
        mutation discountCodeBxgyCreate($bxgyCodeDiscount: DiscountCodeBxgyInput!) {
          discountCodeBxgyCreate(bxgyCodeDiscount: $bxgyCodeDiscount) {
            codeDiscountNode { id }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: { bxgyCodeDiscount: discountInput }
      });
    }

    const responseJson = await response.json();
    console.log(`UTILS: BXGY ${operationName} result:`, JSON.stringify(responseJson));
    
    if (responseJson.errors) {
      return { success: false, error: responseJson.errors[0]?.message || "GraphQL mutation error" };
    }

    let errors = responseJson.data?.[operationName]?.userErrors || [];
    
    // FALLBACK: If creation failed because code is not unique, try to find it again and update
    if (operationName === "discountCodeBxgyCreate" && errors.some(e => e.message.includes("unique") || e.message.includes("taken"))) {
        console.log(`UTILS: BXGY Code ${code} was not unique during create, attempting fallback update...`);
        const retryNode = await findDiscountByCode(admin, code);
        if (retryNode && retryNode.codeDiscount?.__typename === 'DiscountCodeBxgy') {
          console.log(`UTILS: Found BXGY node ${retryNode.id} during fallback, updating instead.`);
          const retryResponse = await admin.graphql(`#graphql
            mutation discountCodeBxgyUpdate($id: ID!, $bxgyCodeDiscount: DiscountCodeBxgyInput!) {
              discountCodeBxgyUpdate(id: $id, bxgyCodeDiscount: $bxgyCodeDiscount) {
                userErrors { field message }
              }
            }
          `, {
            variables: { id: retryNode.id, bxgyCodeDiscount: discountInput }
          });
          const retryJson = await retryResponse.json();
          errors = retryJson.data?.discountCodeBxgyUpdate?.userErrors || [];
        }
    }

    if (errors.length > 0) {
      console.error("UTILS: BXGY User Errors:", errors);
      return { success: false, error: errors.map(e => `${e.field}: ${e.message}`).join(", ") };
    }

    return { success: true };
  } catch (err) {
    console.error("UTILS: BXGY Fatal Error:", err);
    return { success: false, error: err.message };
  }
}
