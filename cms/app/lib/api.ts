// lib/api.ts

import {
  LoginData,
  RegisterData,
  AuthResponse,
  User,
  Article,
  Category,
  MediaFile,
  ArticleTranslation,
  ArticleUpdate,
  Invite,
} from "../types/types";

class ApiClient {
  private baseURL: string;

  constructor() {
    // this.baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    this.baseURL = ""; // Use proxy endpoint
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    // const url = `${this.baseURL}${endpoint}`;
    const url = `/api/proxy${endpoint}`;
    const isFormData = options.body instanceof FormData;

    const config: RequestInit = {
      ...options,
      credentials: "include", // This is correct
    };

    if (!isFormData) {
      config.headers = {
        "Content-Type": "application/json",
        ...options.headers,
      };
    } else {
      // For FormData, keep any headers passed in options
      config.headers = options.headers;
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Auth API
  async loginUser(
    email_or_username: string,
    password: string,
  ): Promise<{ email_or_username: string; password: string }> {
    return this.request<{ email_or_username: string; password: string }>(
      "/api/v1/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          email_or_username,
          password,
        }),
      },
    );
  }

  async registerUser(slug: string, data: RegisterData): Promise<AuthResponse> {
    return this.request<AuthResponse>(`/api/v1/auth/register/${slug}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Email API
  async invite(data: {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    phone: string;
    roleIds: string[];
  }) {
    return this.request<Invite>("/api/v1/users/invite", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getInvites() {
    return this.request<{success: boolean, statusCode: number, data:Invite[]}>("/api/v1/users/invites");
  }

  async deleteEmails(id: string) {
    return this.request(`/api/v1/authorize-emails/${id}`, {
      method: "DELETE",
    });
  }

  // Users API
  async getUsers() {
    return this.request<User[]>("/api/v1/users");
  }

  async deleteUser(id: number) {
    return this.request(`/api/v1/users/${id}`, {
      method: "DELETE",
    });
  }

  async updateUser(id: number, data: Partial<User>) {
    return this.request<User>(`/api/v1/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Articles API
  async getArticles() {
    return this.request<Article[]>("/api/v1/articles");
  }

  async getArticleById(id: string) {
    return this.request<Article>(`/api/v1/articles/${id}`);
  }

  async getArticleBySlug(slug: string) {
    return this.request<Article>(`/api/v1/articles/slug/${slug}`);
  }

  async createArticle(data: Partial<Article>) {
    return this.request<Article>("/api/v1/articles", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateArticle(article_id: number, data: Partial<ArticleUpdate>) {
    return this.request<ArticleUpdate>(`/api/v1/articles/${article_id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteArticle(id: number) {
    return this.request(`/api/v1/articles/${id}`, {
      method: "DELETE",
    });
  }

  //Locale API
  async addLocale(data: Partial<ArticleTranslation>) {
    return this.request<ArticleTranslation>("/api/v1/locale", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteLocale(id: number) {
    return this.request(`/api/v1/delete/locale/${id}`, {
      method: "DELETE",
    });
  }

  // Categories API
  async getCategories() {
    return this.request<Category[]>("/api/v1/categories");
  }

  async getCategoryById(id: string) {
    return this.request<Category>(`/api/v1/categories/${id}`);
  }

  async getCategoryBySlug(slug: string) {
    return this.request<Category>(`/api/v1/categories/slug/${slug}`);
  }

  async getArticlesByCategory(categoryId: string) {
    return this.request<Article[]>(`/api/v1/articles/category/${categoryId}`);
  }

  async getCategoriesByArticle(articleId: string) {
    return this.request<Category[]>(`/api/v1/categories/article/${articleId}`);
  }

  async createCategory(data: Partial<Category>) {
    return this.request<Category>("/api/v1/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: number, data: Partial<Category>) {
    return this.request<Category>(`/api/v1/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: number) {
    return this.request(`/api/v1/categories/${id}`, {
      method: "DELETE",
    });
  }

  // Media API
  async getMedia() {
    return this.request<{ files: string[] }>("/api/v1/uploads");
  }

  async delMedia(filename: string) {
    return this.request(`/api/v1/upload/${filename}`, {
      method: "DELETE",
    });
  }

  async uploadFile(formData: FormData) {
    return this.request(`/api/v1/upload`, {
      method: "POST",
      body: formData,
    });
  }
}

export const apiClient = new ApiClient();
