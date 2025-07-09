import axios from 'axios';

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: manually handle revalidation with Next.js if needed
const REVALIDATE_DURATION = 30 * 1000; // 60 seconds

export async function fetchArticles() {
  try {
    const res = await API.get('/articles');
    return res.data;
  } catch (error) {
    if (error.response) {
      console.error('Articles Status:', error.response.status);
    }
    console.error('Error fetching articles:', error.message);
    return [];
  }
}

export async function fetchArticleById(slug) {
  try {
    const res = await API.get(`/articles/slug/${slug}`);
    return res.data || null;
  } catch (error) {
    if (error.response) {
      console.error('Article Status:', error.response.status);
    }
    console.error('Error fetching article:', error.message);
    return null;
  }
}

export async function fetchArticlesByCategory(slug) {
  try {
    const res = await API.get(`/categories/${slug}/articles`);
    return res.data;
  } catch (error) {
    if (error.response) {
      console.error('Articles by Category Status:', error.response.status);
    }
    console.error('Error fetching articles by category:', error.message);
    return [];
  }
}

export async function fetchCategories() {
  try {
    const res = await API.get('/categories');
    return res.data;
  } catch (error) {
    if (error.response) {
      console.error('Categories Status:', error.response.status);
    }
    console.error('Error fetching categories:', error.message);
    return [];
  }
}
