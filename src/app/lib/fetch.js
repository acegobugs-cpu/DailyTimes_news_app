// import fetch from 'node-fetch';

export async function fetchArticles() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles`, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('Articles Status:', response.status);
      throw new Error('Failed to fetch articles from Strapi');
    }

    const data  = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
}

export async function fetchArticleById(slug) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/articles/slug/${slug}`,{
        headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('Article Status:', response.status);
      throw new Error('Failed to fetch article from Strapi');
    }

    const data = await response.json();
    return data || null; // Return single article or null
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}

export async function fetchArticlesByCategory(slug) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories/${slug}/articles`, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('Articles by Category Status:', response.status);
      throw new Error('Failed to fetch articles by category from Strapi');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching articles by category:', error);
    return [];
  }
}

export async function fetchCategories() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('Categories Status:', response.status);
      throw new Error('Failed to fetch categories from Strapi');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}