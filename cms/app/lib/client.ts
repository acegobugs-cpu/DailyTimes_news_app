import { cookies, headers } from "next/headers";

interface RequestOptions extends RequestInit {
  /** Optional body payload that handles automatic JSON serialization */
  json?: Record<string, any>;
  /** Explicitly pass the CSRF token from Server Actions or Route Handlers */
  csrfToken?: string;
}

class BackendClient {
  private baseUrl: string;

  constructor() {
    // FIX: Safely handle fallback logic without letting undefined throw string concatenations
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";
    this.baseUrl = `${apiBase}/api/v1`;
  }

  private async request(path: string, options: RequestOptions = {}): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const nextHeaders = await headers();
    const nextCookies = await cookies();

    const targetHeaders = new Headers(options.headers);

    if (options.json) {
      targetHeaders.set("Content-Type", "application/json");
      options.body = JSON.stringify(options.json);
      delete options.json;
    }

    const accessToken = nextCookies.get("access_token")?.value;
    if (accessToken) {
      targetHeaders.set("Authorization", `Bearer ${accessToken}`);
    }

    const cookiePairs: string[] = [];
    const refreshToken = nextCookies.get("refresh_token")?.value;
    const csrfSession = nextCookies.get("csrf_session")?.value;

    if (refreshToken) cookiePairs.push(`refresh_token=${refreshToken}`);
    if (csrfSession) cookiePairs.push(`csrf_session=${csrfSession}`);

    if (cookiePairs.length > 0) {
      targetHeaders.set("Cookie", cookiePairs.join("; "));
    }

    // 5. FIX: Inject CSRF Token from options priority, then fallback to headers
    const method = (options.method || "GET").toUpperCase();
    const isMutation = ["POST", "PUT", "DELETE", "PATCH"].includes(method);
    
    if (isMutation) {
      // Priority 1: Explicitly passed token (Crucial for Server Actions)
      // Priority 2: Injected via proxy request header (Crucial for Route Handlers)
      const token = options.csrfToken || nextHeaders.get("X-CSRF-Token");
      
      if (token) {
        targetHeaders.set("X-CSRF-Token", token);
      }
      
      // Clean up our custom field before passing options down to native fetch
      delete options.csrfToken;
    }

    const config: RequestInit = {
      ...options,
      headers: targetHeaders,
      credentials: "include", 
    };

    return fetch(url, config);
  }

  public async get(path: string, options?: RequestOptions) {
    return this.request(path, { ...options, method: "GET" });
  }

  public async post(path: string, body?: Record<string, any>, options?: RequestOptions) {
    return this.request(path, { ...options, method: "POST", json: body });
  }

  public async patch(path: string, body?: Record<string, any>, options?: RequestOptions) {
    return this.request(path, { ...options, method: "PATCH", json: body });
  }


  public async put(path: string, body?: Record<string, any>, options?: RequestOptions) {
    return this.request(path, { ...options, method: "PUT", json: body });
  }

  public async delete(path: string, options?: RequestOptions) {
    return this.request(path, { ...options, method: "DELETE" });
  }
}

export const client = new BackendClient();