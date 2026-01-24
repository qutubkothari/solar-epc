import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gst = searchParams.get("gst");

  if (!gst || gst.length !== 15) {
    return NextResponse.json({ error: "Invalid GST number" }, { status: 400 });
  }

  try {
    // Use Masters India API - free GST lookup
    const apiUrl = `https://commonapi.mastersindia.co/commonapis/searchGSTIN?gstinNumber=${gst}`;
    
    console.log('Fetching GST details for:', gst);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.log('API response not OK:', response.status);
      return NextResponse.json({ 
        success: false, 
        error: "GST API failed" 
      }, { status: 404 });
    }

    const data = await response.json();
    console.log('GST API Response:', JSON.stringify(data, null, 2));

    // Masters India returns: {error: false, data: {...}}
    if (data && data.error === false && data.data) {
      const info = data.data;
      const addr = info.pradr?.addr || {};
      
      return NextResponse.json({
        success: true,
        data: {
          name: info.lgnm || info.tradeNam || '',
          address: addr.st || '',
          city: addr.dst || '',
          state: addr.stcd || info.ctb || '',
          postalCode: addr.pncd || '',
        }
      });
    }

    // If no data found, return error
    return NextResponse.json({ 
      success: false, 
      error: "GST details not found - verify the GST number is correct" 
    }, { status: 404 });

  } catch (error) {
    console.error("GST lookup error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to lookup GST details - API error" 
    }, { status: 500 });
  }
}
