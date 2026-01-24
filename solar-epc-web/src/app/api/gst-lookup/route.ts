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
    // Use GST API India - free lookup service
    const apiUrl = `https://gstapi.charteredinfo.com/API/GSTIN/${gst}`;
    
    console.log('Fetching GST details for:', gst);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
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

    // GST API India returns taxpayer info directly
    if (data && data.lgnm) {
      const pradr = data.pradr || {};
      const addr = pradr.addr || {};
      
      return NextResponse.json({
        success: true,
        data: {
          name: data.tradeNam || data.lgnm || '',
          address: addr.st || '',
          city: addr.dst || '',
          state: addr.stcd || data.ctb || '',
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
