// lib/api.ts

import {
  LoginData,
  RegisterData,
  // AuthResponse,
  User,
  Article,
  Category,
  Email,
  MediaFile,
  // ArticleLocale
} from "../types/types";

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Auth API
  async loginUser(data: LoginData) {
    return this.request<{ token: string; user: User }>("/api/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async registerUser(slug: string, data: RegisterData): Promise<AuthResponse> {
    return this.request<AuthResponse>(`/api/register/${slug}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Email API
  async authorizeEmail(data: { email: string }) {
    return this.request<Email>("/api/authorize-emails", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getEmails() {
    return this.request<Email[]>("/api/getEmails");
  }

  async deleteEmails(id: string) {
    return this.request(`/api/delEmails/${id}`, {
      method: "DELETE",
    });
  }

  // Users API
  async getUsers() {
    return this.request<User[]>("/api/users");
  }

  async deleteUser(id: string) {
    return this.request(`/api/users/${id}`, {
      method: "DELETE",
    });
  }

  async updateUser(id: string, data: Partial<User>) {
    return this.request<User>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Articles API
  async getArticles() {
    return this.request<Article[]>("/api/articles");
  }

  async getArticleById(id: string) {
    return this.request<Article>(`/api/articles/${id}`);
  }

  async getArticleBySlug(slug: string) {
    return this.request<Article>(`/api/articles/slug/${slug}`);
  }

  async createArticle(data: Partial<Article>) {
    return this.request<Article>("/api/articles", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateArticle(article_id: string, data: Partial<Article>) {
    return this.request<Article>(`/api/articles/${article_id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteArticle(id: string) {
    return this.request(`/api/articles/${id}`, {
      method: "DELETE",
    });
  }

  // Categories API
  async getCategories() {
    return this.request<Category[]>("/api/categories");
  }

  async getCategoryById(id: string) {
    return this.request<Category>(`/api/categories/${id}`);
  }

  async getCategoryBySlug(slug: string) {
    return this.request<Category>(`/api/categories/slug/${slug}`);
  }

  async getArticlesByCategory(categoryId: string) {
    return this.request<Article[]>(`/api/articles/category/${categoryId}`);
  }

  async getCategoriesByArticle(articleId: string) {
    return this.request<Category[]>(`/api/categories/article/${articleId}`);
  }

  async createCategory(data: Partial<Category>) {
    return this.request<Category>("/api/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: Partial<Category>) {
    return this.request<Category>(`/api/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string) {
    return this.request(`/api/categories/${id}`, {
      method: "DELETE",
    });
  }

  // Media API
  async getMedia() {
    return this.request<MediaFile[]>("/api/uploads");
  }

  async delMedia(file: string) {
    const filename = file.split("/uploads/")[1];
    return this.request(`/api/upload/${filename}`, {
      method: "DELETE",
    });
  }

  // In your ApiClient class
  async uploadFile(formData: FormData): Promise<{ url: string }> {
    const response = await fetch(`${this.baseURL}/api/upload`, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }
}

export const apiClient = new ApiClient();
