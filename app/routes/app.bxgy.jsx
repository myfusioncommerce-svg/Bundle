import { useState, useEffect, useRef } from "react";
import { useLoaderData, useSubmit, useActionData, useNavigation, useOutletContext } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
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
    <s-page>
      <s-layout>
        <s-layout-section>
          <s-stack direction="block" gap="base">
            <s-box>
              <s-button variant="primary" onClick={handleAddBundle}>
                Create New Bundle
              </s-button>
            </s-box>

            {bundles.length === 0 ? (
              <s-box padding="base" borderWidth="base" borderRadius="base" style={{ textAlign: 'center' }}>
                <s-paragraph>No BXGY bundles created yet. Click "Create New Bundle" to start.</s-paragraph>
              </s-box>
            ) : (
              <s-stack direction="block" gap="base">
                {bundles.map((bundle, index) => (
                  <s-box key={bundle.id || index} padding="base" borderWidth="base" borderRadius="base">
                    <s-stack direction="inline" distribution="equal-spacing" align="center">
                      <s-stack direction="block" gap="tight">
                        <s-text font-weight="bold">
                          Buy {bundle.buyCount} get {bundle.getCount} {bundle.discountType === 'free' ? 'FREE' : `${bundle.discountValue}% off`}
                        </s-text>
                        <s-text font-size="small" color="subdued">
                          {bundle.buyProducts.length} Buy products • {bundle.getProducts.length} Get products
                        </s-text>
                      </s-stack>
                      <s-stack direction="inline" gap="tight">
                        <s-button onClick={() => setEditingIndex(index)}>Edit</s-button>
                        <s-button variant="critical" onClick={() => handleDeleteBundle(index)}>Delete</s-button>
                      </s-stack>
                    </s-stack>
                  </s-box>
                ))}
              </s-stack>
            )}
          </s-stack>
        </s-layout-section>

        <s-layout-section secondary>
          <s-section heading="Theme Integration">
            <s-paragraph>Add the "Buy X Get Y" block to your product page. It will automatically show the correct offer for the current product.</s-paragraph>
            <s-button onClick={() => window.open(`https://${shop}/admin/themes/current/editor?addAppBlockId=a556b982b72af329f9965df4922e2761/bxgy`, '_blank')}>
                Add to Store
            </s-button>
          </s-section>
        </s-layout-section>
      </s-layout>
    </s-page>
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
    <s-page back-action={{ content: "Back", onClick: onCancel }}>
      
      <s-section heading="Customer Buys">
        <s-stack direction="block" gap="base">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>Buy</span>
                <input 
                    type="number" 
                    value={localBundle.buyCount} 
                    onChange={(e) => setLocalBundle({ ...localBundle, buyCount: parseInt(e.target.value) || 1 })}
                    style={{ width: '60px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <span>items from:</span>
            </div>
            <s-button onClick={() => selectProducts('buyProducts', localBundle, setLocalBundle)}>
                {localBundle.buyProducts.length > 0 ? `Edit Products (${localBundle.buyProducts.length})` : "Select Products"}
            </s-button>
            {localBundle.buyProducts.length > 0 && (
                <s-stack direction="inline" gap="tight">
                    {localBundle.buyProducts.map(p => (
                        <s-box key={p.id} padding="tight" borderWidth="base" borderRadius="base">
                            <s-text font-size="small">{p.title}</s-text>
                        </s-box>
                    ))}
                </s-stack>
            )}
        </s-stack>
      </s-section>

      <s-section heading="Customer Gets">
        <s-stack direction="block" gap="base">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>Get</span>
                <input 
                    type="number" 
                    value={localBundle.getCount} 
                    onChange={(e) => setLocalBundle({ ...localBundle, getCount: parseInt(e.target.value) || 1 })}
                    style={{ width: '60px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <span>items from:</span>
            </div>
            <s-button onClick={() => selectProducts('getProducts', localBundle, setLocalBundle)}>
                {localBundle.getProducts.length > 0 ? `Edit Products (${localBundle.getProducts.length})` : "Select Products"}
            </s-button>
            {localBundle.getProducts.length > 0 && (
                <s-stack direction="inline" gap="tight">
                    {localBundle.getProducts.map(p => (
                        <s-box key={p.id} padding="tight" borderWidth="base" borderRadius="base">
                            <s-text font-size="small">{p.title}</s-text>
                        </s-box>
                    ))}
                </s-stack>
            )}

            <div style={{ marginTop: '20px' }}>
                <s-text font-weight="bold">At a Discount</s-text>
                <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input 
                            type="radio" 
                            name="discountType" 
                            checked={localBundle.discountType === 'free'} 
                            onChange={() => setLocalBundle({ ...localBundle, discountType: 'free', discountValue: 100 })}
                        />
                        Free
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input 
                            type="radio" 
                            name="discountType" 
                            checked={localBundle.discountType === 'percentage'} 
                            onChange={() => setLocalBundle({ ...localBundle, discountType: 'percentage', discountValue: 15 })}
                        />
                        Percentage Off
                    </label>
                </div>
                
                {localBundle.discountType === 'percentage' && (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>Discount value:</span>
                        <input 
                            type="number" 
                            value={localBundle.discountValue} 
                            onChange={(e) => setLocalBundle({ ...localBundle, discountValue: parseInt(e.target.value) || 0 })}
                            style={{ width: '80px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                        <span>%</span>
                    </div>
                )}
            </div>
        </s-stack>
      </s-section>
    </s-page>
  );
}
