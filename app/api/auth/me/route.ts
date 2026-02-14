import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const cookies = request.headers.get("cookie") || "";

    const backendResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/me`,
      {
        method: "GET",
        headers: {
          Cookie: cookies,
        },
        cache: "no-store", // always fresh
      }
    );

    if (!backendResponse.ok) {
      return NextResponse.json({ user: null });
    }

    const data = await backendResponse.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/me error:", error);
    return NextResponse.json({ user: null });
  }
}
