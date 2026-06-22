import { cookies } from "next/headers";

export async function getServerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  console.log(token);

  if (!token) return null;

  try {
    // Verify token with backend
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/verify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        // Server → backend, no cookies required
      },
    );

    if (!res.ok) return null;

    const data = await res.json();
    return data.user || null;
  } catch (err) {
    console.error("Server session error:", err);
    return null;
  }
}
