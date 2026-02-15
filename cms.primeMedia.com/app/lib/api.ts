// lib/api.ts

import {
  LoginData,
  RegisterData,
  AuthResponse,
  User,
  Article,
  Category,
  Email,
  MediaFile,
  ArticleTranslation,
  ArticleUpdate,
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
        // if (response.status === 401) {
        //   window.location.href = "/login";
        // }
        throw new Error(`HTTP error! status: ${response.status}`);
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
      "/api/login",
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

  async deleteEmails(id: number) {
    return this.request(`/api/delEmails/${id}`, {
      method: "DELETE",
    });
  }

  // Users API
  async getUsers() {
    return this.request<User[]>("/api/users");
  }

  async deleteUser(id: number) {
    return this.request(`/api/users/${id}`, {
      method: "DELETE",
    });
  }

  async updateUser(id: number, data: Partial<User>) {
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

  async updateArticle(article_id: number, data: Partial<ArticleUpdate>) {
    return this.request<ArticleUpdate>(`/api/articles/${article_id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteArticle(id: number) {
    return this.request(`/api/articles/${id}`, {
      method: "DELETE",
    });
  }

  //Locale API
  async addLocale(data: Partial<ArticleTranslation>) {
    return this.request<ArticleTranslation>("/api/locale", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteLocale(id: number) {
    return this.request(`/api/delete/locale/${id}`, {
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

  async updateCategory(id: number, data: Partial<Category>) {
    return this.request<Category>(`/api/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: number) {
    return this.request(`/api/categories/${id}`, {
      method: "DELETE",
    });
  }

  // Media API
  async getMedia() {
    return this.request<{ files: string[] }>("/api/uploads");
  }

  async delMedia(filename: string) {
    return this.request(`/api/upload/${filename}`, {
      method: "DELETE",
    });
  }

  async uploadFile(formData: FormData) {
    return this.request(`/api/upload`, {
      method: "POST",
      body: formData,
    });
  }
}

export const apiClient = new ApiClient();
