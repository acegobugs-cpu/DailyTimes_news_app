import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token missing" },
        { status: 401 }
      );
    }

    // Forward the refresh token to your backend auth API
    const apiResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/refresh`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );

    if (!apiResponse.ok) {
      const err = await apiResponse.json();
      return NextResponse.json(
        { error: err.error || "Refresh failed" },
        { status: 401 }
      );
    }

    const data = await apiResponse.json();

    cookieStore.set("access_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 30, // 30 minutes
      path: "/",
    });

    cookieStore.set("refresh_token", data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/api/auth",
    });

    // At this step, we just proxy validation; rotation / new tokens come next
    return NextResponse.json({
      message: "Refresh token valid",
      user: {
        id: data.user.id,
        uid: data.user.uid,
        username: data.user.uname,
        email: data.user.email,
        is_superuser: data.user.is_superuser,
      },
    });
  } catch (error) {
    console.error("Refresh endpoint error:", error);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
