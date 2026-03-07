import { useState, useEffect } from "react";
import { Page, Card, Text, BlockStack, InlineStack, Button, Box } from "@shopify/polaris";
import { useLoaderData, useSubmit, useActionData, useNavigation, useOutletContext } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getBundleConfig, setBundleConfig, createBundleDiscount, deleteBundleDiscount } from "../lib/bundle-utils.js";

const METAFIELD_KEY = "volume_discount";

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
        { count: 2, percentage: 10 },
        { count: 3, percentage: 15 },
        { count: 5, percentage: 20 }
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
    const data = await request.json();
    const config = data.config;
    
    if (!config) {
      return { success: false, error: 'No config provided' };
    }

    const oldConfig = await getBundleConfig(admin.graphql, METAFIELD_KEY);
    const oldTiers = oldConfig?.discounts || [];
    const newTiers = config.discounts || [];
    const prefix = "fuvold";

    const success = await setBundleConfig(admin, config, METAFIELD_KEY);

    let discountErrors = [];
    if (success) {
      // Delete removed tiers
      for (const oldTier of oldTiers) {
        const isStillPresent = newTiers.some(t => Number(t.percentage) === Number(oldTier.percentage));
        if (!isStillPresent) {
          await deleteBundleDiscount(admin, `${prefix}-${oldTier.percentage}`);
        }
      }

      // Create/Update current tiers
      if (newTiers && Array.isArray(newTiers)) {
        for (const tier of newTiers) {
          const result = await createBundleDiscount(admin, tier, prefix);
          if (!result.success) {
            discountErrors.push(`Tier ${tier.percentage}%: ${result.error}`);
          }
        }
      }
    }

    return { 
      success: success && discountErrors.length === 0, 
      error: discountErrors.length > 0 ? "Errors: " + discountErrors.join(", ") : (success ? null : 'Failed to save')
    };
  } catch (error) {
    return { success: false, error: error?.message || 'Server error' };
  }
};

export default function VolumeDiscount() {
  const { initialConfig, shop } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();
  const { setSaveAction, setIsSaving } = useOutletContext();
  
  const [products, setProducts] = useState(initialConfig?.products || []);
  const [discounts, setDiscounts] = useState(initialConfig?.discounts || []);
  const [saveStatus, setSaveStatus] = useState(null);
  
  const deepLinkUrl = `https://${shop}/admin/themes/current/editor?addAppBlockId=a556b982b72af329f9965df4922e2761/volume_discount`;

  useEffect(() => {
    setSaveAction(() => handleSave);
    return () => setSaveAction(null);
  }, [products, discounts, setSaveAction]);

  useEffect(() => {
    setIsSaving(navigation.state === "submitting");
  }, [navigation.state, setIsSaving]);

  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        shopify.toast.show("Volume discounts saved!");
        setSaveStatus({ type: 'success', message: 'Volume discounts saved!' });
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        shopify.toast.show(actionData.error || "Failed to save", { isError: true });
        setSaveStatus({ type: 'error', message: actionData.error || 'Failed to save' });
      }
    }
  }, [actionData, shopify]);

  const handleSave = () => {
    submit({ config: { products, discounts } }, { method: "POST", encType: "application/json" });
  };

  const handleSelectProducts = async () => {
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
        image: p.images?.[0]?.originalSrc || p.featuredImage?.url
      })));
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
      const lastCount = discounts.length > 0 ? discounts[discounts.length - 1].count : 1;
      const lastPerc = discounts.length > 0 ? discounts[discounts.length - 1].percentage : 5;
      setDiscounts([...discounts, { count: lastCount + 1, percentage: lastPerc + 5 }]);
    }
  };

  return (
    <Page>
      <BlockStack gap="500">
        {saveStatus && (
          <div style={{
            padding: '12px 16px', borderRadius: '8px',
            backgroundColor: saveStatus.type === 'success' ? '#d4edda' : '#f8d7da',
            color: saveStatus.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${saveStatus.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          }}>
            {saveStatus.message}
          </div>
        )}

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Apply to Products</Text>
            <Text as="p" tone="subdued">Select products that will have volume discount tiers available.</Text>
            <Button onClick={handleSelectProducts}>
              {products.length > 0 ? "Edit Products" : "Select Products"}
            </Button>
            {products.length > 0 && (
              <Box paddingBlockStart="200">
                <InlineStack gap="200">
                  {products.map(p => (
                    <Box key={p.id} padding="200" borderStyle="solid" borderWidth="025" borderColor="border-secondary" borderRadius="200">
                      <InlineStack gap="200" align="center">
                        <img src={p.image} alt="" style={{ width: 24, height: 24, objectFit: 'cover' }} />
                        <Text variant="bodySm">{p.title}</Text>
                        <Button variant="tertiary" onClick={() => removeProduct(p.id)}>×</Button>
                      </InlineStack>
                    </Box>
                  ))}
                </InlineStack>
              </Box>
            )}
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Discount Tiers</Text>
            <Text as="p" tone="subdued">Define how much discount to give based on quantity.</Text>
            <BlockStack gap="300">
              {discounts.map((discount, index) => (
                <Box key={index} padding="400" borderStyle="solid" borderWidth="025" borderColor="border-secondary" borderRadius="200">
                  <InlineStack gap="400" align="center">
                    <Text>Tier {index + 1}:</Text>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexGrow: 1 }}>
                        <span>Buy</span>
                        <input type="number" value={discount.count} onChange={(e) => updateDiscount(index, 'count', e.target.value)} style={{ width: '60px', padding: '4px' }} />
                        <span>or more, get</span>
                        <input type="number" value={discount.percentage} onChange={(e) => updateDiscount(index, 'percentage', e.target.value)} style={{ width: '60px', padding: '4px' }} />
                        <span>% off</span>
                    </div>
                    <Button variant="tertiary" onClick={() => setDiscounts(discounts.filter((_, i) => i !== index))}>Remove</Button>
                  </InlineStack>
                </Box>
              ))}
              {discounts.length < 5 && <Button onClick={addDiscountTier}>Add Tier</Button>}
            </BlockStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Theme Integration</Text>
            <BlockStack gap="200">
              <Text as="p">Add the Volume Discount block to your product page template in the theme editor.</Text>
              <Button 
                variant="primary" 
                onClick={() => window.open(deepLinkUrl, '_blank')}
              >
                Add to Store
              </Button>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
