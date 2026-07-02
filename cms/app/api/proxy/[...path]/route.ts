import { NextRequest, NextResponse } from "next/server";
import { client } from "@/app/lib/client";

async function proxyHandler(req: NextRequest) {
  const targetPath = req.nextUrl.pathname.replace(/^\/api\/proxy/, "");
  const searchParams = req.nextUrl.search; 
  const finalPath = `${targetPath}${searchParams}`;

  const method = req.method.toUpperCase();
  const isMutation = ["POST", "PUT", "DELETE", "PATCH"].includes(method);

  // 1. FIX: Manually pull the CSRF token directly from the incoming browser request headers
  const incomingCsrfToken = req.headers.get("X-CSRF-Token") || undefined;



  let body: any = undefined;
  if (isMutation && req.headers.get("content-type")?.includes("application/json")) {
    try {
      body = await req.json();
    } catch {
      // Handle empty body
    }
  }

  try {
    let apiRes: Response;
    if (isMutation) {
      const options = { csrfToken: incomingCsrfToken };
      if (method === "POST") apiRes = await client.post(finalPath, body, options);
      else if (method === "PUT") apiRes = await client.put(finalPath, body, options);
      else if (method === "DELETE") apiRes = await client.delete(finalPath, options);
      else apiRes = await client.patch(finalPath, body, options);
    } else {
      apiRes = await client.get(finalPath);
    }

    const resHeaders = new Headers(apiRes.headers);
    const setCookie = apiRes.headers.get("set-cookie");
    if (setCookie) {
      resHeaders.set("Set-Cookie", setCookie);
    }

    return new NextResponse(apiRes.body, {
      status: apiRes.status,
      headers: resHeaders,
    });

  } catch (error) {
    console.error(`Proxy failure on ${method} ${finalPath}:`, error);
    return NextResponse.json({ error: "Internal Gateway Error" }, { status: 502 });
  }
}

export {
  proxyHandler as GET,
  proxyHandler as POST,
  proxyHandler as PUT,
  proxyHandler as DELETE,
  proxyHandler as PATCH,
};