export async function refreshAccessToken() {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) return null;

    const data = await res.json();
    console.log("/refresh", data);
    return data.user || null;
  } catch (err) {
    console.error("Refresh failed:", err);
    return null;
  }
}
