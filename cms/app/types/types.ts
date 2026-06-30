export interface LoginData {
  email_or_username: string;
  password: string;
}

export interface RegisterData {
  fname: string;
  lname: string;
  mname?: string;
  uname: string;
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
}

export interface Article {
  id: number;
  tag: string;
  media?: Media;
  category_ids: number[];
  categories: Category[];
  translations: ArticleTranslation[];
  created_at: string;
  updated_at: string;
}

export interface ArticleTranslation {
  id: number;
  article_id?: number;
  locale: string;
  title: string;
  slug: string;
  description?: string;
  content?: any; // JSON content from Tiptap editor
  editor_id: number;
  published_at?: string;
  updated_at?: string;
}

export interface ArticleUpdate {
  id: string;
  tag: string;
  media?: Media;
  category_ids: number[];
  categories?: Category[];
  translations: Record<string, Partial<ArticleTranslation>>;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Invite {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  inviterId?: string;
  status: string;
  roleIds?: string[];
}

export interface MediaFile {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
  uploaded_at: string;
}

export interface Media {
  mediaType: "image" | "video" | "audio" | "embed";
  source: "external" | "local";
  url: string;
  alt?: string;
}

export interface RegisterFormData {
  email: string;
  fname: string;
  mname?: string;
  lname: string;
  uname: string;
  password: string;
}

export interface RegisterResponse {
  token: string;
  user: User;
}

export interface AuthResponse {
  token: string;
  user: User;
}
