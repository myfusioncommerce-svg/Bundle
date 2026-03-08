import { Page, Layout, Card, BlockStack, Text, Box } from "@shopify/polaris";

export default function FAQ() {
  return (
    <Page title="Frequently Asked Questions">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Box>
                <Text variant="headingMd" as="h2">General</Text>
                <BlockStack gap="400">
                  <Box>
                    <Text fontWeight="bold" as="p">How do I create a bundle?</Text>
                    <Text as="p">
                      Navigate to the Bundle Configuration page, select your products, and set your discount tiers.
                    </Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" as="p">Where do the bundles appear?</Text>
                    <Text as="p">
                      Bundles appear on the product pages or dedicated bundle pages depending on your configuration.
                    </Text>
                  </Box>
                </BlockStack>
              </Box>

              <Box>
                <Text variant="headingMd" as="h2">Discounts</Text>
                <BlockStack gap="400">
                  <Box>
                    <Text fontWeight="bold" as="p">Can I offer percentage-based discounts?</Text>
                    <Text as="p">
                      Yes, you can configure progressive percentage discounts based on the number of items in the bundle.
                    </Text>
                  </Box>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}