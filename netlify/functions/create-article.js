import { createClient } from '@sanity/client';

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  token: process.env.SANITY_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03'
});

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { article } = JSON.parse(event.body);
    
    if (!article) {
      throw new Error('No article data provided');
    }

    // Check for duplicates
    const existingArticles = await client.fetch(
      `*[_type == "article" && title == $title]`,
      { title: article.title }
    );

    if (existingArticles.length > 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          message: 'Article already exists'
        })
      };
    }

    // Create new article in Sanity
    const newArticle = await client.create({
      _type: 'article',
      title: article.title,
      date: article.date,
      content: article.content,
      source: article.source,
      link: article.link,
      publishedAt: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        article: newArticle
      })
    };

  } catch (error) {
    console.error('Error creating article:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
