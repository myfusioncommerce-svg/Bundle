import { useState, useEffect } from "react";
import { Page, Card, Text, BlockStack, InlineStack, Button, Box } from "@shopify/polaris";
import { useLoaderData, useSubmit, useActionData, useNavigation, useOutletContext } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getBundleConfig, setBundleConfig, createBundleDiscount, deleteBundleDiscount } from "../lib/bundle-utils.js";

const METAFIELD_KEY = "product_page";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
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
    const clonedRequest = request.clone();
    const bodyText = await clonedRequest.text();
    
    if (!bodyText) {
      return { success: false, error: 'Empty request body' };
    }
    
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (parseErr) {
      return { success: false, error: `JSON parse error: ${parseErr.message}` };
    }
    
    const config = data.config;
    if (!config) {
      return { success: false, error: 'No config provided' };
    }

    // 1. Get old config to identify removed tiers
    const oldConfig = await getBundleConfig(admin.graphql, METAFIELD_KEY);
    const oldTiers = oldConfig?.discounts || [];
    const newTiers = config.discounts || [];

    console.log("ROUTE ACTION (Product): Old tiers count:", oldTiers.length);
    console.log("ROUTE ACTION (Product): New tiers count:", newTiers.length);

    console.log("ROUTE ACTION (Product): Config received:", JSON.stringify(config));
    const success = await setBundleConfig(admin, config, METAFIELD_KEY);

    let discountErrors = [];
    if (success) {
      // 2. Delete removed tiers
      const prefix = "fuprbl";
      console.log("ROUTE ACTION (Product): Checking for tiers to delete...");
      for (const oldTier of oldTiers) {
        const isStillPresent = newTiers.some(t => Number(t.percentage) === Number(oldTier.percentage));
        console.log(`ROUTE ACTION (Product): Checking old tier ${oldTier.percentage}%. Still present? ${isStillPresent}`);
        if (!isStillPresent) {
          const code = `${prefix}-${oldTier.percentage}`;
          console.log(`ROUTE ACTION (Product): Calling deleteBundleDiscount for: ${code}`);
          const result = await deleteBundleDiscount(admin, code);
          if (!result.success) {
            console.error(`ROUTE ACTION (Product): Failed to delete ${code}: ${result.error}`);
          } else {
            console.log(`ROUTE ACTION (Product): Delete call for ${code} finished.`);
          }
        }
      }

      // 3. Create/Update current tiers
      if (newTiers && Array.isArray(newTiers)) {
        for (const tier of newTiers) {
          const result = await createBundleDiscount(admin, tier, prefix);
          if (!result.success) {
            discountErrors.push(`Tier ${tier.percentage}%: ${result.error}`);
          }
        }
      }
    }

    if (success) {
      return { 
        success: discountErrors.length === 0, 
        error: discountErrors.length > 0 ? "Metafield saved but discounts failed: " + discountErrors.join(", ") : null 
      };
    } else {
      return { success: false, error: 'Failed to save to metafield' };
    }
  } catch (error) {
    return {
      success: false,
      error: error?.message || 'Unknown server error',
    };
  }
};

export default function ProductBundle() {
  const { initialConfig } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();
  const { setSaveAction, setIsSaving } = useOutletContext();
  
  const [products, setProducts] = useState(initialConfig?.products || []);
  const [discounts, setDiscounts] = useState(initialConfig?.discounts || []);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    const config = {
      products,
      discounts,
    };

    submit(
      { config },
      { method: "POST", encType: "application/json" }
    );
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
        image: p.images?.[0]?.originalSrc || p.images?.[0]?.src || p.featuredImage?.url
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
      setDiscounts([...discounts, { count: discounts.length + 2, percentage: (discounts.length + 1) * 5 }]);
    }
  };

  const removeDiscountTier = (index) => {
    const newDiscounts = discounts.filter((_, i) => i !== index);
    setDiscounts(newDiscounts);
  };

  return (
    <Page>
      <BlockStack gap="500">
        {saveStatus && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: saveStatus.type === 'success' ? '#d4edda' : '#f8d7da',
            color: saveStatus.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${saveStatus.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          }}>
            {saveStatus.message}
          </div>
        )}

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Products</Text>
            <Text as="p" tone="subdued">Select the products that will be available in the product bundle.</Text>
            <InlineStack gap="300">
              <Button onClick={handleSelectProducts}>
                {products.length > 0 ? "Edit Products" : "Select Products"}
              </Button>
              
              {products.length > 0 && (
                <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
                  View Selected ({products.length})
                </Button>
              )}
            </InlineStack>
          </BlockStack>
        </Card>

        {isModalOpen && (
          <div 
            role="presentation"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }} 
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsModalOpen(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                width: '90%',
                maxWidth: '600px',
                maxHeight: '80%',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }} 
            >
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <Text fontWeight="bold" variant="bodyLg">Selected Products</Text>
                <Button variant="tertiary" onClick={() => setIsModalOpen(false)}>Close</Button>
              </div>
              
              <div style={{ padding: '20px', overflowY: 'auto', flexGrow: 1 }}>
                <BlockStack gap="300">
                  {products.map((product) => (
                    <Box key={product.id} padding="400" borderStyle="solid" borderWidth="025" borderColor="border-secondary" borderRadius="200">
                      <InlineStack gap="400" align="center">
                        <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f4f4', borderRadius: '4px', overflow: 'hidden' }}>
                          {product.image ? (
                            <img src={product.image} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '10px', color: '#999' }}>No img</span>
                          )}
                        </div>
                        <div style={{ flexGrow: 1 }}>
                          <Text fontWeight="bold">{product.title || product.handle}</Text>
                        </div>
                        <Button variant="tertiary" onClick={() => removeProduct(product.id)}>Remove</Button>
                      </InlineStack>
                    </Box>
                  ))}
                </BlockStack>
              </div>
              
              <div style={{
                padding: '16px 20px',
                borderTop: '1px solid #eee',
                display: 'flex',
                justifyContent: 'flex-end',
              }}>
                <Button variant="primary" onClick={() => setIsModalOpen(false)}>Done</Button>
              </div>
            </div>
          </div>
        )}

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Discount Tiers</Text>
            <Text as="p" tone="subdued">Configure the progressive discount rules (Max 5).</Text>
            <BlockStack gap="300">
              {discounts.map((discount, index) => (
                <Box key={index} padding="400" borderStyle="solid" borderWidth="025" borderColor="border-secondary" borderRadius="200">
                  <InlineStack gap="400" align="center">
                    <Text>Tier {index + 1}:</Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>If</span>
                        <input 
                            type="number" 
                            value={discount.count} 
                            onChange={(e) => updateDiscount(index, 'count', e.target.value)}
                            style={{ width: '60px', padding: '4px' }}
                        />
                        <span>products, then</span>
                        <input 
                            type="number" 
                            value={discount.percentage} 
                            onChange={(e) => updateDiscount(index, 'percentage', e.target.value)}
                            style={{ width: '60px', padding: '4px' }}
                        />
                        <span>% off</span>
                    </div>
                    <Button variant="tertiary" onClick={() => removeDiscountTier(index)}>Remove</Button>
                  </InlineStack>
                </Box>
              ))}
              {discounts.length < 5 && (
                <Button onClick={addDiscountTier}>Add Discount Tier</Button>
              )}
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
