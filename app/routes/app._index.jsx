import { useState, useEffect } from "react";
import { useLoaderData, useSubmit, useActionData, useNavigation, useOutletContext } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { 
  Page, 
  Layout, 
  Card, 
  Text, 
  BlockStack, 
  InlineStack, 
  Box, 
  Button,
  Banner,
  TextField,
  Modal,
  Thumbnail
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getBundleConfig, setBundleConfig, createBundleDiscount, deleteBundleDiscount } from "../lib/bundle-utils.js";

const METAFIELD_KEY = "config";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const savedConfig = await getBundleConfig(admin.graphql, METAFIELD_KEY);
  
  if (savedConfig && savedConfig.products && savedConfig.products.length > 0) {
    const productIds = savedConfig.products.map(p => p.id);
    const response = await admin.graphql(`#graphql
      query getProducts($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            handle
            featuredImage {
              url
            }
          }
        }
      }
    `, {
      variables: { ids: productIds }
    });
    
    const responseJson = await response.json();
    const nodes = responseJson.data?.nodes || [];
    
    savedConfig.products = savedConfig.products.map(p => {
      const node = nodes.find(n => n && n.id === p.id);
      return {
        ...p,
        title: node?.title || p.title,
        image: node?.featuredImage?.url || p.image
      };
    });
  }

  return {
    shop: session.shop,
    initialConfig: savedConfig || {
      products: [],
      discounts: [
        { count: 2, percentage: 5 },
        { count: 3, percentage: 10 },
        { count: 4, percentage: 15 }
      ]
    }
  };
};

export const action = async ({ request }) => {
  if (request.method !== 'POST') {
    return { success: false, error: 'Method not allowed' };
  }

  try {
    const { admin } = await authenticate.admin(request);
    const body = await request.json();
    const config = body.config;
    
    if (!config) {
      return { success: false, error: 'No config provided' };
    }

    const oldConfig = await getBundleConfig(admin.graphql, METAFIELD_KEY);
    const oldTiers = oldConfig?.discounts || [];
    const newTiers = config.discounts || [];

    const success = await setBundleConfig(admin, config, METAFIELD_KEY);

    let discountErrors = [];
    if (success) {
      const prefix = "fubndl";
      for (const oldTier of oldTiers) {
        const isStillPresent = newTiers.some(t => Number(t.percentage) === Number(oldTier.percentage));
        if (!isStillPresent) {
          await deleteBundleDiscount(admin, `${prefix}-${oldTier.percentage}`);
        }
      }

      if (newTiers && Array.isArray(newTiers)) {
        for (const tier of newTiers) {
          const result = await createBundleDiscount(admin, tier, prefix);
          if (!result.success) {
            discountErrors.push(`Tier ${tier.percentage}%: ${result.error}`);
          }
        }
      }
    }

    if (success && discountErrors.length === 0) {
      return { success: true, error: null };
    } else if (success) {
      return { success: false, error: discountErrors.join(", ") };
    } else {
      return { success: false, error: 'Failed to save configuration' };
    }
  } catch (error) {
    return { success: false, error: error?.message || 'Unknown server error' };
  }
};

export default function Index() {
  const { initialConfig, shop } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();
  const { setSaveAction, setIsSaving } = useOutletContext();
  
  const [products, setProducts] = useState(initialConfig?.products || []);
  const [discounts, setDiscounts] = useState(initialConfig?.discounts || []);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const deepLinkUrl = `https://${shop}/admin/themes/current/editor?addAppBlockId=a556b982b72af329f9965df4922e2761/bundle_builder`;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      setSaveAction(() => handleSave);
    }
    return () => setSaveAction(null);
  }, [products, discounts, isClient]);

  useEffect(() => {
    setIsSaving(navigation.state === "submitting");
  }, [navigation.state, setIsSaving]);

  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        shopify.toast.show("Configuration saved!");
        setSaveStatus({ type: 'success', message: 'Configuration saved!' });
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        shopify.toast.show(actionData.error || "Failed to save", { isError: true });
        setSaveStatus({ type: 'error', message: actionData.error || 'Failed to save' });
      }
    }
  }, [actionData, shopify]);

  const handleSave = () => {
    submit(
      { config: { products, discounts } },
      { method: "POST", encType: "application/json" }
    );
  };

  const handleSelectProducts = async () => {
    try {
      const selected = await shopify.resourcePicker({
        type: "product",
        multiple: true,
        selectionIds: products.map(p => ({ id: p.id }))
      });

      if (selected) {
        setProducts(selected.map(p => ({ 
          id: p.id, 
          handle: p.handle,
          title: p.title,
          image: p.images?.[0]?.originalSrc || p.images?.[0]?.src || p.featuredImage?.url
        })));
      }
    } catch (error) {
      console.error("Resource picker error:", error);
    }
  };

  const removeProduct = (productId) => {
    setProducts(products.filter(p => p.id !== productId));
  };

  const updateDiscount = (index, field, value) => {
    const newDiscounts = [...discounts];
    newDiscounts[index][field] = parseInt(value) || 0;
    setDiscounts(newDiscounts);
  };

  const addDiscountTier = () => {
    if (discounts.length < 5) {
      setDiscounts([...discounts, { count: discounts.length + 2, percentage: (discounts.length + 1) * 5 }]);
    }
  };

  const removeDiscountTier = (index) => {
    setDiscounts(discounts.filter((_, i) => i !== index));
  };

  if (!isClient) return null;

  return (
    <Page>
      {saveStatus && (
        <Box paddingBlockEnd="400">
          <Banner tone={saveStatus.type === 'success' ? 'success' : 'critical'}>
            <p>{saveStatus.message}</p>
          </Banner>
        </Box>
      )}
      
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Products</Text>
              <Text as="p">Select the products that will be available in the bundle builder.</Text>
              <InlineStack gap="300">
                <Button onClick={handleSelectProducts}>
                  {products.length > 0 ? "Edit Products" : "Select Products"}
                </Button>
                
                {products.length > 0 && (
                  <Button onClick={() => setIsModalOpen(true)}>
                    View Selected ({products.length})
                  </Button>
                )}
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Discount Tiers</Text>
              <Text as="p">Configure the progressive discount rules (Max 5).</Text>
              <BlockStack gap="300">
                {discounts.map((discount, index) => (
                  <Box key={index} padding="400" borderWidth="025" borderRadius="200" borderColor="border">
                    <InlineStack gap="400" align="center" wrap={false}>
                      <div style={{ flexGrow: 1 }}>
                        <InlineStack gap="200" align="center">
                          <Text>Tier {index + 1}: If</Text>
                          <div style={{ width: '70px' }}>
                            <TextField
                              type="number"
                              value={String(discount.count)}
                              onChange={(val) => updateDiscount(index, 'count', val)}
                              autoComplete="off"
                            />
                          </div>
                          <Text>products, then</Text>
                          <div style={{ width: '70px' }}>
                            <TextField
                              type="number"
                              value={String(discount.percentage)}
                              onChange={(val) => updateDiscount(index, 'percentage', val)}
                              autoComplete="off"
                              suffix="%"
                            />
                          </div>
                          <Text>off</Text>
                        </InlineStack>
                      </div>
                      <Button variant="tertiary" tone="critical" onClick={() => removeDiscountTier(index)}>Remove</Button>
                    </InlineStack>
                  </Box>
                ))}
                {discounts.length < 5 && (
                  <Button onClick={addDiscountTier}>Add Discount Tier</Button>
                )}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Theme Integration</Text>
              <Text as="p">To display the bundle builder on your store, you need to add the app block to your product page template.</Text>
              <Button onClick={() => window.open(deepLinkUrl, '_blank')}>
                Add to Store
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Selected Products"
        primaryAction={{
          content: 'Done',
          onAction: () => setIsModalOpen(false),
        }}
      >
        <Modal.Section>
          <BlockStack gap="300">
            {products.length === 0 ? (
              <Text as="p">No products selected.</Text>
            ) : (
              products.map((product) => (
                <Box key={product.id} padding="300" borderWidth="025" borderRadius="200" borderColor="border">
                  <InlineStack gap="400" align="center">
                    <Thumbnail
                      source={product.image || ""}
                      alt={product.title || "Product"}
                      size="small"
                    />
                    <div style={{ flexGrow: 1 }}>
                      <Text fontWeight="bold">{product.title || product.handle}</Text>
                    </div>
                    <Button variant="tertiary" tone="critical" onClick={() => removeProduct(product.id)}>Remove</Button>
                  </InlineStack>
                </Box>
              ))
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}