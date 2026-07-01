import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // 1. Extract the specific HttpOnly token safely using Next.js built-in cookie reader
    const tokenCookie = request.cookies.get("access_token"); 
    const token = tokenCookie ? tokenCookie.value : "";

    // 2. Prepare headers for the Go backend
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    console.log("token:",token);
    // 3. Inject the token as a Bearer header if it exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // 4. Forward the request to your Go/Chi application
    const backendResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/me`,
      {
        method: "GET",
        headers: headers,
        cache: "no-store", 
      }
    );

    if (!backendResponse.ok) {
      return NextResponse.json({ user: null }, { status: backendResponse.status });
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("GET /api/me error:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}