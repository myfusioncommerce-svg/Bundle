import { useState, useEffect } from "react";
import { useLoaderData, useSubmit, useActionData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getBundleConfig, setBundleConfig } from "../lib/bundle-utils.js";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const savedConfig = await getBundleConfig(admin.graphql);
  
  if (savedConfig && savedConfig.products && savedConfig.products.length > 0) {
    // Fetch current product details (title, image) to ensure UI is up to date
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
  console.log("ROUTE ACTION: Hit");
  if (request.method !== 'POST') {
    return { success: false, error: 'Method not allowed' };
  }

  try {
    const { admin } = await authenticate.admin(request);
    const clonedRequest = request.clone();
    const bodyText = await clonedRequest.text();
    console.log("ROUTE ACTION: Body received:", bodyText.substring(0, 100));
    
    if (!bodyText) {
      return { success: false, error: 'Empty request body' };
    }
    
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (parseErr) {
      console.error("ROUTE ACTION: JSON Parse Error", parseErr);
      return { success: false, error: `JSON parse error: ${parseErr.message}` };
    }
    
    const config = data.config;
    if (!config) {
      console.error("ROUTE ACTION: No config in body");
      return { success: false, error: 'No config provided' };
    }

    const success = await setBundleConfig(admin, config);
    console.log("ROUTE ACTION: setBundleConfig success:", success);

    if (success) {
      return { success: true, error: null };
    } else {
      return { success: false, error: 'Failed to save to metafield' };
    }
  } catch (error) {
    console.error("ROUTE ACTION: Unhandled Error", error);
    return {
      success: false,
      error: error?.message || 'Unknown server error',
    };
  }
};

export default function BundleConfig() {
  const { initialConfig } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const shopify = useAppBridge();
  
  const [products, setProducts] = useState(initialConfig?.products || []);
  const [discounts, setDiscounts] = useState(initialConfig?.discounts || []);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    <s-page heading="Bundle Configuration">
      {saveStatus && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          backgroundColor: saveStatus.type === 'success' ? '#d4edda' : '#f8d7da',
          color: saveStatus.type === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${saveStatus.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
        }}>
          {saveStatus.message}
        </div>
      )}
      <s-button 
        slot="primary-action" 
        variant="primary" 
        onClick={handleSave}
        loading={navigation.state === "submitting" ? "true" : undefined}
      >
        Save Configuration
      </s-button>

      <s-section heading="Products">
        <s-paragraph>Select the products that will be available in the bundle builder.</s-paragraph>
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base">
            <s-button onClick={handleSelectProducts}>
              {products.length > 0 ? "Edit Products" : "Select Products"}
            </s-button>
            
            {products.length > 0 && (
              <s-button variant="secondary" onClick={() => setIsModalOpen(true)}>
                View Selected ({products.length})
              </s-button>
            )}
          </s-stack>
        </s-stack>
      </s-section>

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
              <s-text font-weight="bold" font-size="large">Selected Products</s-text>
              <s-button variant="tertiary" onClick={() => setIsModalOpen(false)}>Close</s-button>
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto', flexGrow: 1 }}>
              <s-stack direction="block" gap="tight">
                {products.map((product) => (
                  <s-box key={product.id} padding="base" borderWidth="base" borderRadius="base">
                    <s-stack direction="inline" gap="base" align="center">
                      <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f4f4', borderRadius: '4px', overflow: 'hidden' }}>
                        {product.image ? (
                          <img src={product.image} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '10px', color: '#999' }}>No img</span>
                        )}
                      </div>
                      <div style={{ flexGrow: 1 }}>
                        <s-text font-weight="bold">{product.title || product.handle}</s-text>
                      </div>
                      <s-button variant="tertiary" onClick={() => removeProduct(product.id)}>Remove</s-button>
                    </s-stack>
                  </s-box>
                ))}
              </s-stack>
            </div>
            
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid #eee',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <s-button variant="primary" onClick={() => setIsModalOpen(false)}>Done</s-button>
            </div>
          </div>
        </div>
      )}

      <s-section heading="Discount Tiers">
        <s-paragraph>Configure the progressive discount rules (Max 5).</s-paragraph>
        <s-stack direction="block" gap="base">
          {discounts.map((discount, index) => (
            <s-box key={index} padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="inline" gap="base" align="center">
                <s-text>Tier {index + 1}:</s-text>
                <div className="discount-input-row">
                    <span>If</span>
                    <input 
                        type="number" 
                        value={discount.count} 
                        onChange={(e) => updateDiscount(index, 'count', e.target.value)}
                        className="small-input"
                    />
                    <span>products, then</span>
                    <input 
                        type="number" 
                        value={discount.percentage} 
                        onChange={(e) => updateDiscount(index, 'percentage', e.target.value)}
                        className="small-input"
                    />
                    <span>% off</span>
                </div>
                <s-button variant="tertiary" onClick={() => removeDiscountTier(index)}>Remove</s-button>
              </s-stack>
            </s-box>
          ))}
          {discounts.length < 5 && (
            <s-button onClick={addDiscountTier}>Add Discount Tier</s-button>
          )}
        </s-stack>
      </s-section>

      <style>{`
        .discount-input-row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-grow: 1;
        }
        .small-input {
          width: 60px;
          padding: 4px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
      `}</style>
    </s-page>
  );
}
