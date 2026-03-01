import { Page, Layout, Card, Text, Button, Box, Grid, BlockStack, Icon, InlineStack, Banner } from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";
import { useLoaderData, useNavigate } from "react-router";
import { authenticate, MONTHLY_PLAN } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  
  const billingCheck = await billing.check({
    plans: [MONTHLY_PLAN],
    isTest: true,
  });

  const storeHandle = session.shop.split(".")[0];

  return { 
    hasActivePlan: billingCheck.hasActivePayment,
    storeHandle
  };
};

export const action = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  
  // This will trigger the Shopify billing approval flow
  await billing.request({
    plan: MONTHLY_PLAN,
    isTest: true,
  });

  return null;
};

export default function PricingPage() {
  const { storeHandle } = useLoaderData();
  const navigate = useNavigate();

  const pricingPlans = [
    {
      title: "Premium Plan",
      price: "$9.99",
      period: "/month",
      description: "Everything you need to boost your store revenue with professional bundles.",
      features: [
        "Unlimited Product Bundles",
        "Volume & Tiered Discounts",
        "Buy X Get Y (BXGY) Offers",
        "Advanced Analytics Dashboard",
        "Premium Email Templates",
        "Priority Support",
      ],
      isPopular: true,
      // User requested specific URL
      externalUrl: `https://admin.shopify.com/store/${storeHandle}/charges/bundle-builder-84/pricing_plans`
    }
  ];

  return (
    <Page title="Pricing & Plans">
      <Layout>
        <Layout.Section>
          <Banner title="Secure Billing" tone="info">
            <p>Select a plan to unlock all premium features and start growing your store today.</p>
          </Banner>
        </Layout.Section>
        
        <Layout.Section>
          <div style={{ 
            marginTop: '40px', 
            marginBottom: '60px', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <Text variant="heading3xl" as="h1">Boost Your Sales Today</Text>
            <Box paddingBlockStart="400">
              <Text variant="bodyLg" as="p" tone="subdued">
                Choose the plan that fits your business needs. Simple, transparent pricing.
              </Text>
            </Box>
          </div>
        </Layout.Section>

        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 4, xl: 4 }} />
            {pricingPlans.map((plan, index) => (
              <Grid.Cell key={index} columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
                <Card padding="0">
                  <Box 
                    padding="800" 
                    background={plan.isPopular ? "bg-surface-brand-selected" : "bg-surface"}
                    style={{
                      borderTopLeftRadius: 'var(--p-border-radius-300)',
                      borderTopRightRadius: 'var(--p-border-radius-300)',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--p-border-divider)'
                    }}
                  >
                    {plan.isPopular && (
                      <Box paddingBlockEnd="400">
                        <span style={{
                          backgroundColor: 'var(--p-color-bg-fill-brand)',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          Most Popular
                        </span>
                      </Box>
                    )}
                    <Text variant="headingLg" as="h2">{plan.title}</Text>
                    <Box paddingBlockStart="400" paddingBlockEnd="200">
                      <InlineStack align="center" blockAlign="baseline" gap="100">
                        <Text variant="heading3xl" as="span">{plan.price}</Text>
                        <Text variant="bodyMd" as="span" tone="subdued">{plan.period}</Text>
                      </InlineStack>
                    </Box>
                    <Text variant="bodyMd" as="p" tone="subdued">{plan.description}</Text>
                  </Box>
                  
                  <Box padding="800">
                    <BlockStack gap="400">
                      {plan.features.map((feature, fIndex) => (
                        <InlineStack key={fIndex} gap="200" wrap={false}>
                          <Icon source={CheckIcon} tone="success" />
                          <Text variant="bodyMd" as="span">{feature}</Text>
                        </InlineStack>
                      ))}
                    </BlockStack>
                    
                    <Box paddingBlockStart="800">
                      <Button 
                        size="large" 
                        variant="primary" 
                        fullWidth 
                        onClick={() => window.open(plan.externalUrl, '_top')}
                      >
                        Activate Plan
                      </Button>
                    </Box>
                  </Box>
                </Card>
              </Grid.Cell>
            ))}
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 4, xl: 4 }} />
          </Grid>
        </Layout.Section>

        <Layout.Section>
          <Box paddingBlockStart="1000" paddingBlockEnd="1000" textAlign="center">
            <Text variant="bodySm" as="p" tone="subdued">
              All plans include a 7-day free trial. Cancel anytime.
            </Text>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
