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
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/login`,
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

    if (!authResponse.ok) {
      const error = await authResponse.json();
      return NextResponse.json(
        {message:   error.message    ||   "UnKnown error"},
        {status:    error.status     ||   500           }
      );
    }

    const authData = await authResponse.json();

    // Set HttpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set("access_token", authData.data.tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 30, // 30 min
      path: "/",
    });

    cookieStore.set("refresh_token", authData.data.tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/api/auth",
    });

    return NextResponse.json({ user: authData.data.user });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
