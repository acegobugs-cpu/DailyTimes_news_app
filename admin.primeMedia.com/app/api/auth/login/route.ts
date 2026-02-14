import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { email_or_username, password } = await request.json();

    if (!email_or_username || !password) {
      return NextResponse.json(
        { error: "Username/email and password are required" },
        { status: 400 }
      );
    }

    // Call your authentication service/API
    const authResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_or_username,
          password,
        }),
      }
    );
    console.log("Auth API response status:", authResponse.status);

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.log("Auth API error:", errorText);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const authData = await authResponse.json();
    console.log("Auth API success:", {
      hasToken: !!authData.access_token,
      hasRotate: !!authData.refresh_token,
      hasUser: !!authData.user,
    });

    // Set HttpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set("access_token", authData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 30, // 30 min
      path: "/",
    });

    cookieStore.set("refresh_token", authData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/api/auth",
    });

    return NextResponse.json({ user: authData.user });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
