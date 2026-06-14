import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { invoice, total } = (await request.json()) as { invoice: string; total: number };

    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const encodedKey = Buffer.from(serverKey + ":").toString("base64");

    const midtransPayload = {
      transaction_details: {
        order_id: invoice,
        gross_amount: total,
      },
      payment_type: ["gopay", "qris", "shopeepay"],
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

    const data = (await response.json()) as { token?: string; message?: string };

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat token Midtrans");
    }

    return NextResponse.json({ token: data.token });
  } catch (error: unknown) {
    console.error("Eror API Midtrans:", error);
    const errorMsg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}