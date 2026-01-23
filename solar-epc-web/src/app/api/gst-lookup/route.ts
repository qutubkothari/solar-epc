import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gst = searchParams.get("gst");

  if (!gst || gst.length !== 15) {
    return NextResponse.json({ error: "Invalid GST number" }, { status: 400 });
  }

  try {
    // Try multiple APIs in order of preference
    
    // API 1: GST Master Check
    try {
      const response1 = await fetch(`https://sheet.gstincheck.co.in/check/${gst}`, {
        headers: {
          'Accept': 'application/json',
        },
      });
      const data1 = await response1.json();
      
      if (data1.flag && data1.data) {
        return NextResponse.json({
          success: true,
          data: {
            name: data1.data.tradeNam || data1.data.lgnm || '',
            address: data1.data.pradr?.addr?.bno ? 
              `${data1.data.pradr.addr.bno || ''} ${data1.data.pradr.addr.st || ''}`.trim() :
              data1.data.pradr?.addr?.st || '',
            city: data1.data.pradr?.addr?.dst || '',
            state: data1.data.pradr?.addr?.stcd || '',
            postalCode: data1.data.pradr?.addr?.pncd || '',
          }
        });
      }
    } catch (err) {
      console.log('API 1 failed:', err);
    }

    // API 2: Knowlarity API
    try {
      const response2 = await fetch(`https://api.knowlarity.com/v1/gst/verify?gstin=${gst}`, {
        headers: {
          'Accept': 'application/json',
        },
      });
      const data2 = await response2.json();
      
      if (data2.status === 'success' && data2.data) {
        return NextResponse.json({
          success: true,
          data: {
            name: data2.data.legal_name || data2.data.trade_name || '',
            address: data2.data.principal_place_address || '',
            city: data2.data.principal_place_city || '',
            state: data2.data.principal_place_state || '',
            postalCode: data2.data.principal_place_pincode || '',
          }
        });
      }
    } catch (err) {
      console.log('API 2 failed:', err);
    }

    // API 3: GST Portal (public search)
    try {
      const response3 = await fetch(`https://services.gst.gov.in/services/api/search/tp?gstin=${gst}`, {
        headers: {
          'Accept': 'application/json',
        },
      });
      const data3 = await response3.json();
      
      if (data3.status === 'Active' || data3.sts === 'Active') {
        return NextResponse.json({
          success: true,
          data: {
            name: data3.tradeNam || data3.legalName || '',
            address: data3.pradr?.addr?.bno ? 
              `${data3.pradr.addr.bno || ''} ${data3.pradr.addr.st || ''}`.trim() :
              data3.pradr?.adr || '',
            city: data3.pradr?.addr?.dst || '',
            state: data3.pradr?.addr?.stcd || data3.stj || '',
            postalCode: data3.pradr?.addr?.pncd || '',
          }
        });
      }
    } catch (err) {
      console.log('API 3 failed:', err);
    }

    return NextResponse.json({ 
      success: false, 
      error: "GST details not found" 
    }, { status: 404 });

  } catch (error) {
    console.error("GST lookup error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to lookup GST details" 
    }, { status: 500 });
  }
}
