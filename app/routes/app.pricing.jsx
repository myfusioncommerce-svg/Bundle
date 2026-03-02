import { useLoaderData, Form, useNavigation } from "react-router";
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  BlockStack,
  Box,
  Divider,
} from "@shopify/polaris";
import { authenticate, MONTHLY_PLAN } from "../shopify.server";

export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  
  // Check if they already have an active subscription
  const billingCheck = await billing.check({
    plans: [MONTHLY_PLAN],
    isTest: process.env.NODE_ENV !== "production",
  });

  if (billingCheck.hasActivePayment) {
    // If they already have a plan, redirect to the main app dashboard
    throw new Response(null, {
      status: 302,
      headers: { Location: "/app" },
    });
  }

  return null;
};

export const action = async ({ request }) => {
  const { billing } = await authenticate.admin(request);

  // Request payment for the monthly plan
  await billing.request({
    plan: MONTHLY_PLAN,
    isTest: process.env.NODE_ENV !== "production",
    returnUrl: `${process.env.SHOPIFY_APP_URL}/app`,
  });

  return null;
};

export default function PricingPage() {
  const nav = useNavigation();
  const isLoading = nav.state === "submitting";

  return (
    <Page title="Select a Plan">
      <Layout>
        <Layout.Section>
          <Box paddingBlockEnd="400">
            <Text as="p" variant="bodyLg" tone="subdued">
              To start using Fusion Upsell Bundle and boost your store revenue, please select a plan below.
            </Text>
          </Box>
          <Card padding="600">
            <BlockStack gap="400">
              <BlockStack gap="200" align="center">
                <Text as="h2" variant="headingXl">
                  Professional Plan
                </Text>
                <Text as="p" variant="headingLg" tone="success">
                  $9.99 / month
                </Text>
              </BlockStack>
              
              <Divider />
              
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  ✓ Unlimited Bundles & Upsells
                </Text>
                <Text as="p" variant="bodyMd">
                  ✓ Advanced Analytics Dashboard
                </Text>
                <Text as="p" variant="bodyMd">
                  ✓ Custom CSS & Brand Matching
                </Text>
                <Text as="p" variant="bodyMd">
                  ✓ 24/7 Priority Support
                </Text>
              </BlockStack>
              
              <Box paddingBlockStart="400">
                <Form method="post">
                  <Button 
                    variant="primary" 
                    size="large" 
                    fullWidth 
                    submit 
                    loading={isLoading}
                  >
                    Activate Plan & Start Selling
                  </Button>
                </Form>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
