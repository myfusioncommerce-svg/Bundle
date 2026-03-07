import { useState, useEffect, useRef } from "react";
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
  ButtonGroup,
  RadioButton
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getBundleConfig, setBundleConfig, createBXGYDiscount } from "../lib/bundle-utils.js";

const METAFIELD_KEY = "bxgy_config";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const savedConfig = await getBundleConfig(admin.graphql, METAFIELD_KEY);
  
  // Ensure we always return an array
  const bundles = Array.isArray(savedConfig) ? savedConfig : (savedConfig ? [savedConfig] : []);
  
  return {
    shop: session.shop,
    bundles: bundles
  };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const data = await request.json();
  const bundles = data.bundles;

  const success = await setBundleConfig(admin, bundles, METAFIELD_KEY);
  let discountError = null;

  if (success) {
    // For BXGY, we'll try to create/update all discounts
    for (const bundle of bundles) {
      const result = await createBXGYDiscount(admin, bundle);
      if (!result.success) {
        discountError = result.error;
      }
    }
  }

  return { success: success && !discountError, error: discountError };
};

export default function BXGYConfig() {
  const { bundles: initialBundles, shop } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();
  const { setSaveAction, setIsSaving } = useOutletContext();

  const [bundles, setBundles] = useState(initialBundles);
  const [editingIndex, setEditingIndex] = useState(null); // null means list view, -1 means new, 0+ means edit

  useEffect(() => {
    if (editingIndex === null) {
      setSaveAction(null);
    }
  }, [editingIndex, setSaveAction]);

  useEffect(() => {
    setIsSaving(navigation.state === "submitting");
  }, [navigation.state, setIsSaving]);

  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        shopify.toast.show("BXGY Bundles saved!");
        setEditingIndex(null);
      } else {
        shopify.toast.show(actionData.error || "Failed to save", { isError: true });
      }
    }
  }, [actionData, shopify]);

  const handleSaveAll = (updatedBundles) => {
    submit({ bundles: updatedBundles || bundles }, { method: "POST", encType: "application/json" });
  };

  const handleAddBundle = () => {
    const newBundle = {
      id: `bxgy_${Date.now()}`,
      buyCount: 1,
      buyProducts: [],
      getCount: 1,
      getProducts: [],
      discountType: 'free',
      discountValue: 100
    };
    const newBundles = [...bundles, newBundle];
    setBundles(newBundles);
    setEditingIndex(newBundles.length - 1);
  };

  const handleUpdateBundle = (updatedBundle) => {
    const newBundles = [...bundles];
    newBundles[editingIndex] = updatedBundle;
    setBundles(newBundles);
    handleSaveAll(newBundles);
  };

  const handleDeleteBundle = (index) => {
    if (confirm("Are you sure you want to delete this bundle?")) {
      const newBundles = bundles.filter((_, i) => i !== index);
      setBundles(newBundles);
      handleSaveAll(newBundles);
    }
  };

  const selectProducts = async (field, currentBundle, setLocalBundle) => {
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      selectionIds: currentBundle[field].map(p => ({ id: p.id }))
    });

    if (selected) {
      setLocalBundle({
        ...currentBundle,
        [field]: selected.map(p => ({
          id: p.id,
          handle: p.handle,
          title: p.title,
          image: p.images?.[0]?.originalSrc || p.featuredImage?.url
        }))
      });
    }
  };

  if (editingIndex !== null) {
    return (
      <BundleEditor 
        bundle={bundles[editingIndex]} 
        onSave={handleUpdateBundle} 
        onCancel={() => setEditingIndex(null)}
        selectProducts={selectProducts}
        isSaving={navigation.state === "submitting"}
      />
    );
  }

  return (
    <Page title="Buy X Get Y Bundles">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Box>
              <Button variant="primary" onClick={handleAddBundle}>
                Create New Bundle
              </Button>
            </Box>

            {bundles.length === 0 ? (
              <Card>
                <Box padding="400">
                  <Text as="p" textAlign="center">No BXGY bundles created yet. Click "Create New Bundle" to start.</Text>
                </Box>
              </Card>
            ) : (
              <BlockStack gap="400">
                {bundles.map((bundle, index) => (
                  <Card key={bundle.id || index}>
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text fontWeight="bold">
                          Buy {bundle.buyCount} get {bundle.getCount} {bundle.discountType === 'free' ? 'FREE' : `${bundle.discountValue}% off`}
                        </Text>
                        <Text variant="bodySm" as="p" tone="subdued">
                          {bundle.buyProducts.length} Buy products • {bundle.getProducts.length} Get products
                        </Text>
                      </BlockStack>
                      <InlineStack gap="200">
                        <Button onClick={() => setEditingIndex(index)}>Edit</Button>
                        <Button tone="critical" onClick={() => handleDeleteBundle(index)}>Delete</Button>
                      </InlineStack>
                    </InlineStack>
                  </Card>
                ))}
              </BlockStack>
            )}
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">Theme Integration</Text>
              <Text as="p">Add the "Buy X Get Y" block to your product page. It will automatically show the correct offer for the current product.</Text>
              <Button onClick={() => window.open(`https://${shop}/admin/themes/current/editor?addAppBlockId=a556b982b72af329f9965df4922e2761/bxgy`, '_blank')}>
                  Add to Store
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function BundleEditor({ bundle, onSave, onCancel, selectProducts, isSaving }) {
  const [localBundle, setLocalBundle] = useState(bundle);
  const { setSaveAction } = useOutletContext();
  const localBundleRef = useRef(localBundle);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    localBundleRef.current = localBundle;
    onSaveRef.current = onSave;
  }, [localBundle, onSave]);

  useEffect(() => {
    setSaveAction(() => () => onSaveRef.current(localBundleRef.current));
    return () => setSaveAction(null);
  }, [setSaveAction]);

  return (
    <Page 
      backAction={{ content: "Back", onClick: onCancel }}
      title="Edit BXGY Bundle"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Customer Buys</Text>
                <InlineStack gap="300" align="center">
                    <Text>Buy</Text>
                    <input 
                        type="number" 
                        value={localBundle.buyCount} 
                        onChange={(e) => setLocalBundle({ ...localBundle, buyCount: parseInt(e.target.value) || 1 })}
                        style={{ width: '60px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                    <Text>items from:</Text>
                </InlineStack>
                <Button onClick={() => selectProducts('buyProducts', localBundle, setLocalBundle)}>
                    {localBundle.buyProducts.length > 0 ? `Edit Products (${localBundle.buyProducts.length})` : "Select Products"}
                </Button>
                {localBundle.buyProducts.length > 0 && (
                    <InlineStack gap="200">
                        {localBundle.buyProducts.map(p => (
                            <Box key={p.id} padding="200" borderWidth="025" borderRadius="200" borderColor="border">
                                <Text variant="bodySm">{p.title}</Text>
                            </Box>
                        ))}
                    </InlineStack>
                )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Customer Gets</Text>
                <InlineStack gap="300" align="center">
                    <Text>Get</Text>
                    <input 
                        type="number" 
                        value={localBundle.getCount} 
                        onChange={(e) => setLocalBundle({ ...localBundle, getCount: parseInt(e.target.value) || 1 })}
                        style={{ width: '60px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                    <Text>items from:</Text>
                </InlineStack>
                <Button onClick={() => selectProducts('getProducts', localBundle, setLocalBundle)}>
                    {localBundle.getProducts.length > 0 ? `Edit Products (${localBundle.getProducts.length})` : "Select Products"}
                </Button>
                {localBundle.getProducts.length > 0 && (
                    <InlineStack gap="200">
                        {localBundle.getProducts.map(p => (
                            <Box key={p.id} padding="200" borderWidth="025" borderRadius="200" borderColor="border">
                                <Text variant="bodySm">{p.title}</Text>
                            </Box>
                        ))}
                    </InlineStack>
                )}

                <Box paddingBlockStart="400">
                    <Text fontWeight="bold">At a Discount</Text>
                    <BlockStack gap="200">
                        <RadioButton
                            label="Free"
                            checked={localBundle.discountType === 'free'}
                            onChange={() => setLocalBundle({ ...localBundle, discountType: 'free', discountValue: 100 })}
                        />
                        <RadioButton
                            label="Percentage Off"
                            checked={localBundle.discountType === 'percentage'}
                            onChange={() => setLocalBundle({ ...localBundle, discountType: 'percentage', discountValue: 15 })}
                        />
                    </BlockStack>
                    
                    {localBundle.discountType === 'percentage' && (
                        <Box paddingBlockStart="300">
                            <InlineStack gap="300" align="center">
                                <Text>Discount value:</Text>
                                <input 
                                    type="number" 
                                    value={localBundle.discountValue} 
                                    onChange={(e) => setLocalBundle({ ...localBundle, discountValue: parseInt(e.target.value) || 0 })}
                                    style={{ width: '80px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                                <Text>%</Text>
                            </InlineStack>
                        </Box>
                    )}
                </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
