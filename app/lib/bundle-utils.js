
export async function getBundleConfig(graphql) {
  const response = await graphql(`#graphql
    query GetBundleConfig {
      shop {
        metafield(namespace: "bundle_builder", key: "config") {
          value
        }
      }
    }
  `);

  const responseJson = await response.json();
  const value = responseJson.data?.shop?.metafield?.value;
  return value ? JSON.parse(value) : null;
}

export async function setBundleConfig(admin, config) {
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
          key: "config",
          type: "json",
          value: JSON.stringify(config)
        }
      ]
    }
  });

  const responseJson = await response.json();
  return !responseJson.data?.metafieldsSet?.userErrors?.length;
}
