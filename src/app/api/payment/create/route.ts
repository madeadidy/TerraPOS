import { NextResponse } from "next/server";

interface MidtransItemInput {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export async function POST(request: Request) {
  try {
    // 1. Ambil data tambahan tax dan discount dari request
    const { invoiceNumber, total, items, tax, discount } = await request.json();

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      return NextResponse.json({ error: "Midtrans Server Key tidak terkonfigurasi" }, { status: 500 });
    }

    const encodedKey = Buffer.from(`${serverKey}:`).toString("base64");

    // 2. Map item bawaan dari keranjang belanja
    const itemDetails = (items as MidtransItemInput[]).map((item) => ({
      id: item.id,
      price: Math.round(item.price),
      quantity: item.qty,
      name: item.name.slice(0, 50),
    }));

    // 3. Masukkan Pajak sebagai item tambahan jika nilainya lebih dari 0
    if (tax && tax > 0) {
      itemDetails.push({
        id: "TAX-11",
        price: Math.round(tax),
        quantity: 1,
        name: "Pajak POS (11%)",
      });
    }

    // 4. Masukkan Diskon sebagai item bernilai minus (Sesuai dokumentasi Midtrans)
    if (discount && discount > 0) {
      itemDetails.push({
        id: "DISC-GLOBAL",
        price: -Math.round(discount), // Harga minus mengurangi total sum
        quantity: 1,
        name: "Diskon Toko",
      });
    }

    const payload = {
      transaction_details: {
        order_id: invoiceNumber,
        gross_amount: Math.round(total),
      },
      item_details: itemDetails, // Menggunakan array yang sudah disinkronkan
      enabled_payments: ["qris", "gopay", "shopeepay", "bank_transfer"],
    };

    const response = await fetch("https://app.sandbox.midtrans.com/snap/v1/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${encodedKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as { token: string; redirect_url: string; error_messages?: string[] };

    if (!response.ok) {
      throw new Error(data.error_messages?.[0] || "Gagal membuat transaksi di Midtrans");
    }

    return NextResponse.json({ token: data.token, redirectUrl: data.redirect_url });
  } catch (error) {
    console.error("Midtrans Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}