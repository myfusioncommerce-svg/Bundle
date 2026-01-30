import prisma from "../db.server";

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    let shop = url.searchParams.get("shop");
    
    if (!shop) {
      const referer = request.headers.get('referer') || '';
      if (referer) {
        const refererUrl = new URL(referer);
        shop = refererUrl.hostname;
      }
    }

    if (!shop) {
      return new Response(JSON.stringify({ products: [], discounts: [] }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Find the shop session
    const session = await prisma.session.findFirst({
      where: { 
        shop: { contains: shop }
      },
      orderBy: { id: 'desc' },
    });
    
    if (!session || !session.accessToken) {
      return new Response(JSON.stringify({ error: 'No session found' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const response = await fetch(
      `https://${session.shop}/admin/api/2024-10/metafields.json?namespace=bundle_builder&key=config`,
      {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': session.accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (data.metafields && data.metafields.length > 0) {
      const metafield = data.metafields[0];
      const config = JSON.parse(metafield.value || '{}');
      
      return new Response(JSON.stringify(config), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify({ products: [], discounts: [] }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error fetching bundle config:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
