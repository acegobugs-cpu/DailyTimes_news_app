// import fetch from 'node-fetch';

export async function fetchArticles() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles?populate[image][populate]=*&populate[category][populate]=*`, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('Articles Status:', response.status);
      throw new Error('Failed to fetch articles from Strapi');
    }

    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
}

export async function fetchArticleById(slug) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/articles?filters[slug][$eq]=${encodeURIComponent(slug)}&populate[image][populate]=*&populate[category][populate]=*&populate[content][populate]=*`,{
        headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('Article Status:', response.status);
      throw new Error('Failed to fetch article from Strapi');
    }

    const { data } = await response.json();
    return data[0] || null; // Return single article or null
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}

export async function fetchArticlesByCategory(category) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles?filters[category][name][$eq]=${category}&populate[image][populate]=*&populate[category][populate]=*`, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('Articles by Category Status:', response.status);
      throw new Error('Failed to fetch articles by category from Strapi');
    }

    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching articles by category:', error);
    return [];
  }
}

export async function fetchCategories() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories?populate=*`, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('Categories Status:', response.status);
      throw new Error('Failed to fetch categories from Strapi');
    }

    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

function transformArticles(articlesData) {
  return articlesData.map(item => {
    // Basic validation
    if (!item.id) {
      console.warn('Invalid article data:', item);
      return null;
    }

    return {
      id: item.id,
      title: item.Title, // Strapi uses lowercase
      description: item.description || '',
      content: item.content || [], // Capital C in Strapi
      category: item.category?.map(cat => cat.name) || [],
      author: item.author?.name || 'Unknown',
      date: item.date || item.createdAt || new Date().toISOString(),
      image: item.image?.url
        ? `${process.env.STRAPI_API_URL || 'http://localhost:1337'}${item.image.url}`
        : null,
      tag: item.tag, // Use priority for tag
      AID: item.AID || item.id,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
      publishedAt: item.publishedAt || new Date().toISOString(),
      locale: item.locale || 'en',
      meta: item.meta || {},
      seo: item.seo || {},
      slug: item.slug || '',
    };
  }).filter(item => item !== null); // Remove invalid items
}

function transformCategories(categoriesData) {
  return categoriesData.map(item => {
    // Basic validation
    if (!item.id) {
      console.warn('Invalid category data:', item);
      return null;
    }

    return {
      id: item.id,
      documentId: item.documentId || '',
      CID: item.CID || '',
      name: item.name || '',
      Path: item.Path || '',
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
      publishedAt: item.publishedAt || new Date().toISOString(),
      locale: item.locale || 'en',
    };
  }).filter(item => item !== null); // Remove invalid items
}

