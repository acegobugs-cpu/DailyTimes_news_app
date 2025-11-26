export interface LoginData {
  email_or_username: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  name: string;
  role: string;
  is_superuser?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Article {
  categories: Category[];
  translations: ArticleTranslation[];
  media: any;
  id: string;
  title: string;
  content: string;
  slug: string;
  locale: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ArticleTranslation {
  id: string;
  article_id: string;
  locale: string;
  title: string;
  slug: string;
  description?: string;
  content?: any; // JSON content from Tiptap editor
  editor_id: number;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Email {
  id: string;
  email: string;
  slug: string;
  inviter_id?: string;
  used: boolean;
  created_at?: string;
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
  width?: string;
  height?: string;
}

export interface RegisterData {
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
