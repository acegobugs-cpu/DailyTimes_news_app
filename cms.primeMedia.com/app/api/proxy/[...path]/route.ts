import { NextRequest, NextResponse } from "next/server";

// Helper function to forward request to backend
async function forwardToBackend(
  fullPath: string,
  request: NextRequest,
  method: string = "GET",
  body?: any,
  extraHeaders: Record<string, string> = {},
) {
  // Forward all cookies from the original request
  const cookieHeader = request.headers.get("cookie") || "";

  // Merge cookie and any extra headers provided by the caller.
  const headers: Record<string, string> = {
    Cookie: cookieHeader,
    ...extraHeaders,
  };

  // Default to JSON when body is present and no Content-Type was specified,
  // but avoid setting Content-Type for FormData so the boundary is set automatically.
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  if (body != null && !headers["Content-Type"] && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const config: RequestInit = {
    method,
    headers,
  };

  // Add body for methods that require it
  if (body != null && ["POST", "PUT", "PATCH"].includes(method)) {
    // If Content-Type is JSON, stringify objects (but allow passing already-stringified text).
    if (
      headers["Content-Type"] === "application/json" &&
      typeof body !== "string"
    ) {
      config.body = JSON.stringify(body);
    } else {
      // For FormData or raw text, pass the body as-is.
      config.body = body;
    }
  }

  // console.log("🔍 Proxy request:", {
  //   path: fullPath,
  //   method,
  //   hasCookies: !!cookieHeader,
  //   body: body ? "Present" : "None",
  //   headers,
  // });

  const backendResponse = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/${fullPath}`,
    config,
  );

  const contentType = backendResponse.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await backendResponse.json();
    return NextResponse.json(data, { status: backendResponse.status });
  } else {
    const textData = await backendResponse.text();
    return new NextResponse(textData, {
      status: backendResponse.status,
      headers: contentType ? { "Content-Type": contentType } : undefined,
    });
  }
}

// GET - For fetching data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const fullPath = path.join("/");
  // Need to preserve query parameters
  const searchParams = request.nextUrl.searchParams.toString();
  const backendPath = searchParams ? `${fullPath}?${searchParams}` : fullPath;

  return forwardToBackend(backendPath, request, "GET");
}

// POST - For creating data
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const fullPath = path.join("/");
  const contentType = request.headers.get("content-type") || "";

  console.log("📤 Proxy POST received:", {
    fullPath,
    contentType,
    url: request.url,
  });
  console.log(request);

  let body: any = undefined;
  const extraHeaders: Record<string, string> = {};

  if (contentType.includes("multipart/form-data")) {
    // For file uploads: forward FormData directly and do not set Content-Type (boundary required)
    body = await request.formData();
    extraHeaders["Contnet-Type"] = "multipart/form-data";
    // body = formData;
  } else if (contentType.includes("application/json")) {
    // For JSON requests: parse JSON and set Content-Type
    body = await request.json();
    extraHeaders["Content-Type"] = "application/json";
  } else {
    // For other types: forward raw text and preserve content-type if present
    body = await request.text();
    if (contentType) {
      extraHeaders["Content-Type"] = contentType;
    }
  }

  return forwardToBackend(fullPath, request, "POST", body, extraHeaders);
}

// PUT - For updating/replacing data
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const fullPath = path.join("/");
  const contentType = request.headers.get("content-type") || "";

  let body: any = undefined;
  const extraHeaders: Record<string, string> = {};

  if (contentType.includes("multipart/form-data")) {
    // For file uploads via PUT
    const formData = await request.formData();
    body = formData;
  } else if (contentType.includes("application/json")) {
    body = await request.json();
    extraHeaders["Content-Type"] = "application/json";
  } else {
    body = await request.text();
    if (contentType) {
      extraHeaders["Content-Type"] = contentType;
    }
  }

  return forwardToBackend(fullPath, request, "PUT", body, extraHeaders);
}

// PATCH - For partial updates
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const fullPath = path.join("/");
  const body = await request.json();
  return forwardToBackend(fullPath, request, "PATCH", body);
}

// DELETE - For deleting data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const fullPath = path.join("/");
  // Missing: Parse request body if present
  const contentType = request.headers.get("content-type") || "";
  let body: any = undefined;

  if (contentType.includes("application/json")) {
    try {
      body = await request.json();
    } catch (e) {
      // Ignore if no body
    }
  }

  return forwardToBackend(fullPath, request, "DELETE", body);
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
