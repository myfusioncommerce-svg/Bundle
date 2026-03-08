import { Page, Layout, Card, BlockStack, Text } from "@shopify/polaris";

export default function PrivacyPolicy() {
  return (
    <Page title="Privacy Policy">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Information Collection</Text>
                <Text as="p">
                  We collect information from you when you use our app, including your shop name, 
                  email address, and product information required for bundle configuration.
                </Text>
              </BlockStack>

              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Data Usage</Text>
                <Text as="p">
                  Your data is used solely to provide and improve the bundle building experience 
                  on your Shopify store. We do not sell your personal information to third parties.
                </Text>
              </BlockStack>

              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Contact Us</Text>
                <Text as="p">
                  If you have any questions regarding this privacy policy, you may contact us using the 
                  information on our Contact Us page.
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}