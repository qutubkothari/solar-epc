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
    // Use the most reliable free GST API
    const apiUrl = `https://appyflow.in/verifyGST?gstNo=${gst}&key_secret=OnlyForTesting`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
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

    // Check for successful response
    if (data && data.taxpayerInfo) {
      const info = data.taxpayerInfo;
      const pradr = info.pradr || {};
      
      // Build address string
      let addressParts = [];
      if (pradr.bno) addressParts.push(pradr.bno);
      if (pradr.bnm) addressParts.push(pradr.bnm);
      if (pradr.st) addressParts.push(pradr.st);
      if (pradr.loc) addressParts.push(pradr.loc);
      
      const address = addressParts.join(', ');

      return NextResponse.json({
        success: true,
        data: {
          name: info.tradeNam || info.lgnm || '',
          address: address || '',
          city: pradr.dst || '',
          state: pradr.stcd || info.stjCd || '',
          postalCode: pradr.pncd || '',
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
