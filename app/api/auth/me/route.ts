import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify token and get user data from your API
    const userResponse = await fetch(
      `${process.env.API_BASE_URL}/api/user/me`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!userResponse.ok) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = await userResponse.json();
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: "Authentication check failed" },
      { status: 500 }
    );
  }
}
