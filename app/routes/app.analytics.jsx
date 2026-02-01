import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Fetch recent orders that might have our bundle discounts
  // We query for orders and will filter them in JS for robustness
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

  // Filter orders that used our bundle discounts (prefixes: fubndl-, fuprbl-)
  const bundleOrders = orders.filter(order => 
    order.discountCodes.some(code => 
      code.toLowerCase().startsWith('fubndl-') || 
      code.toLowerCase().startsWith('fuprbl-')
    )
  ).map(order => ({
    id: order.id,
    name: order.name,
    date: order.createdAt,
    total: order.totalPriceSet.presentmentMoney.amount,
    currency: order.totalPriceSet.presentmentMoney.currencyCode,
    discountCode: order.discountCodes.find(code => 
      code.toLowerCase().startsWith('fubndl-') || 
      code.toLowerCase().startsWith('fuprbl-')
    ),
    discountAmount: order.totalDiscountsSet.presentmentMoney.amount
  }));

  const stats = bundleOrders.reduce((acc, order) => {
    acc.totalSales += parseFloat(order.total);
    acc.totalDiscounts += parseFloat(order.discountAmount);
    acc.orderCount += 1;
    return acc;
  }, { totalSales: 0, totalDiscounts: 0, orderCount: 0 });

  return { bundleOrders, stats };
};

export default function Analytics() {
  const { bundleOrders, stats } = useLoaderData();

  return (
    <s-page heading="Bundle Analytics">
      <s-layout>
        <s-layout-section>
          <s-stack direction="inline" gap="base" distribution="fill">
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight" align="center">
                <s-text font-size="small" color="subdued">Total Bundle Orders</s-text>
                <s-text font-weight="bold" font-size="extra-large">{stats.orderCount}</s-text>
              </s-stack>
            </s-box>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight" align="center">
                <s-text font-size="small" color="subdued">Total Bundle Sales</s-text>
                <s-text font-weight="bold" font-size="extra-large">
                  {new Intl.NumberFormat(undefined, { style: 'currency', currency: bundleOrders[0]?.currency || 'USD' }).format(stats.totalSales)}
                </s-text>
              </s-stack>
            </s-box>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight" align="center">
                <s-text font-size="small" color="subdued">Total Discounts Given</s-text>
                <s-text font-weight="bold" font-size="extra-large" color="critical">
                   {new Intl.NumberFormat(undefined, { style: 'currency', currency: bundleOrders[0]?.currency || 'USD' }).format(stats.totalDiscounts)}
                </s-text>
              </s-stack>
            </s-box>
          </s-stack>
        </s-layout-section>

        <s-layout-section>
          <s-section heading="Recent Bundle Orders">
            {bundleOrders.length === 0 ? (
              <s-paragraph>No bundle orders found yet. Keep building those bundles!</s-paragraph>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
                    <th style={{ padding: '12px 8px' }}>Order</th>
                    <th style={{ padding: '12px 8px' }}>Date</th>
                    <th style={{ padding: '12px 8px' }}>Discount Code</th>
                    <th style={{ padding: '12px 8px' }}>Discount</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bundleOrders.map((order) => (
                    <tr key={order.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                      <td style={{ padding: '12px 8px' }}>{order.name}</td>
                      <td style={{ padding: '12px 8px' }}>{new Date(order.date).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 8px' }}><code>{order.discountCode}</code></td>
                      <td style={{ padding: '12px 8px' }}>{new Intl.NumberFormat(undefined, { style: 'currency', currency: order.currency }).format(order.discountAmount)}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                        {new Intl.NumberFormat(undefined, { style: 'currency', currency: order.currency }).format(order.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </s-section>
        </s-layout-section>
      </s-layout>
    </s-page>
  );
}
