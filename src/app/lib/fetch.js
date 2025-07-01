// import fetch from 'node-fetch';

async function fetchArticles() {
  try {
    const response = await fetch(`${process.env.STRAPI_API_URL || 'http://192.168.0.110:1337'}/api/articles?populate[image][populate]=*&populate[category][populate]=*`, {
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

async function fetchCategories() {
  try {
    const response = await fetch(`${process.env.STRAPI_API_URL || 'http://192.168.0.110:1337'}/api/categories?populate=*`, {
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

export { fetchArticles, fetchCategories, transformArticles, transformCategories };