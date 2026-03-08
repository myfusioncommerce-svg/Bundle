import { useLoaderData } from "react-router";
import { 
  Page, 
  Layout, 
  Card, 
  Text, 
  BlockStack, 
  InlineStack, 
  Box, 
  DataTable 
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Fetch recent orders that might have our bundle discounts
  const response = await admin.graphql(`#graphql
    query getRecentOrders {
      orders(first: 50, reverse: true) {
        nodes {
          id
          name
          createdAt
          totalPriceSet {
            presentmentMoney {
              amount
              currencyCode
            }
          }
          discountCodes
          totalDiscountsSet {
            presentmentMoney {
              amount
            }
          }
        }
      }
    }
  `);

  const responseJson = await response.json();
  const orders = responseJson.data?.orders?.nodes || [];

  const bundleOrders = orders.filter(order => 
    order.discountCodes.some(code => 
      code.toLowerCase().startsWith('fubndl-') || 
      code.toLowerCase().startsWith('fuprbl-') ||
      code.toLowerCase().startsWith('fuvold-') ||
      code.toLowerCase().startsWith('fubxgy-')
    )
  ).map(order => ({
    id: order.id,
    name: order.name,
    date: order.createdAt,
    total: order.totalPriceSet.presentmentMoney.amount,
    currency: order.totalPriceSet.presentmentMoney.currencyCode,
    discountCode: order.discountCodes.find(code => 
      code.toLowerCase().startsWith('fubndl-') || 
      code.toLowerCase().startsWith('fuprbl-') ||
      code.toLowerCase().startsWith('fuvold-') ||
      code.toLowerCase().startsWith('fubxgy-')
    ),
    discountAmount: order.totalDiscountsSet.presentmentMoney.amount
  }));

  const stats = bundleOrders.reduce((acc, order) => {
    acc.totalSales += parseFloat(order.total);
    acc.totalDiscounts += parseFloat(order.discountAmount);
    acc.orderCount += 1;

    const code = (order.discountCode || "").toLowerCase();
    if (code.startsWith('fubndl-')) acc.typeBreakdown.bundleBuilder += 1;
    else if (code.startsWith('fuprbl-')) acc.typeBreakdown.productBundle += 1;
    else if (code.startsWith('fuvold-')) acc.typeBreakdown.volumeDiscount += 1;
    else if (code.startsWith('fubxgy-')) acc.typeBreakdown.bxgy += 1;

    return acc;
  }, { 
    totalSales: 0, 
    totalDiscounts: 0, 
    orderCount: 0,
    typeBreakdown: { bundleBuilder: 0, productBundle: 0, volumeDiscount: 0, bxgy: 0 }
  });

  return { bundleOrders, stats };
};

export default function Analytics() {
  const { bundleOrders, stats } = useLoaderData();

  return (
    <Page title="Analytics">
      <Layout>
        <Layout.Section>
          <InlineStack gap="400">
            <Box padding="400" borderWidth="025" borderRadius="200" borderColor="border" minWidth="200px">
              <BlockStack gap="100" align="center">
                <Text variant="bodySm" tone="subdued">Total Bundle Orders</Text>
                <Text variant="headingXl" as="p">{stats.orderCount}</Text>
              </BlockStack>
            </Box>
            <Box padding="400" borderWidth="025" borderRadius="200" borderColor="border" minWidth="200px">
              <BlockStack gap="100" align="center">
                <Text variant="bodySm" tone="subdued">Total Bundle Sales</Text>
                <Text variant="headingXl" as="p">
                  {new Intl.NumberFormat(undefined, { style: 'currency', currency: bundleOrders[0]?.currency || 'USD' }).format(stats.totalSales)}
                </Text>
              </BlockStack>
            </Box>
            <Box padding="400" borderWidth="025" borderRadius="200" borderColor="border" minWidth="200px">
              <BlockStack gap="100" align="center">
                <Text variant="bodySm" tone="subdued">Total Discounts Given</Text>
                <Text variant="headingXl" as="p" tone="critical">
                   {new Intl.NumberFormat(undefined, { style: 'currency', currency: bundleOrders[0]?.currency || 'USD' }).format(stats.totalDiscounts)}
                </Text>
              </BlockStack>
            </Box>
          </InlineStack>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Bundle Type Breakdown</Text>
              <InlineStack gap="400">
                <Box padding="400" borderWidth="025" borderRadius="200" borderColor="border">
                  <BlockStack gap="100" align="center">
                    <Text variant="bodySm">Bundle Builder</Text>
                    <Text fontWeight="bold">{stats.typeBreakdown.bundleBuilder} orders</Text>
                  </BlockStack>
                </Box>
                <Box padding="400" borderWidth="025" borderRadius="200" borderColor="border">
                  <BlockStack gap="100" align="center">
                    <Text variant="bodySm">Product Bundle</Text>
                    <Text fontWeight="bold">{stats.typeBreakdown.productBundle} orders</Text>
                  </BlockStack>
                </Box>
                <Box padding="400" borderWidth="025" borderRadius="200" borderColor="border">
                  <BlockStack gap="100" align="center">
                    <Text variant="bodySm">Volume Discount</Text>
                    <Text fontWeight="bold">{stats.typeBreakdown.volumeDiscount} orders</Text>
                  </BlockStack>
                </Box>
                <Box padding="400" borderWidth="025" borderRadius="200" borderColor="border">
                  <BlockStack gap="100" align="center">
                    <Text variant="bodySm">Buy X Get Y</Text>
                    <Text fontWeight="bold">{stats.typeBreakdown.bxgy} orders</Text>
                  </BlockStack>
                </Box>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Recent Bundle Orders</Text>
              {bundleOrders.length === 0 ? (
                <Text as="p">No bundle orders found yet. Keep building those bundles!</Text>
              ) : (
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'numeric', 'numeric']}
                  headings={['Order', 'Date', 'Discount Code', 'Discount', 'Total']}
                  rows={bundleOrders.map(order => [
                    order.name,
                    new Date(order.date).toLocaleDateString(),
                    order.discountCode,
                    new Intl.NumberFormat(undefined, { style: 'currency', currency: order.currency }).format(order.discountAmount),
                    new Intl.NumberFormat(undefined, { style: 'currency', currency: order.currency }).format(order.total)
                  ])}
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}