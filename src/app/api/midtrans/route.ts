import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { invoice, total } = (await request.json()) as { invoice: string; total: number };

    // Membaca domain asal secara dinamis (Lokal / Vercel)
    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      return NextResponse.json(
        { error: "MIDTRANS_SERVER_KEY belum dikonfigurasi pada Environment Variables." },
        { status: 500 }
      );
    }

    const encodedKey = Buffer.from(serverKey + ":").toString("base64");

    const midtransPayload = {
      transaction_details: {
        order_id: invoice,
        gross_amount: Number(total),
      },
      // 🌟 PERBAIKAN 1: Menggunakan enabled_payments (parameter resmi Snap Midtrans)
      enabled_payments: ["gopay", "qris", "shopeepay"],
      callbacks: {
        finish: `${baseUrl}/pos`,
        unfinish: `${baseUrl}/pos`,
        error: `${baseUrl}/pos`,
      },
    };

    const response = await fetch("https://app.sandbox.midtrans.com/snap/v1/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${encodedKey}`,
      },
      body: JSON.stringify(midtransPayload),
    });

    const data = (await response.json()) as {
      token?: string;
      error_messages?: string[];
      status_message?: string;
      message?: string;
    };

    if (!response.ok) {
      // 🌟 PERBAIKAN 2: Membaca error_messages / status_message asli dari respons Midtrans
      const errorDetail =
        data.error_messages?.join(", ") ||
        data.status_message ||
        data.message ||
        "Gagal membuat token Midtrans";
      throw new Error(errorDetail);
    }

    return NextResponse.json({ token: data.token });
  } catch (error: unknown) {
    console.error("Eror API Midtrans:", error);
    const errorMsg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}