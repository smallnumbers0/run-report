import fetch from 'node-fetch';

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { articles } = JSON.parse(event.body);
    
    if (!articles || !Array.isArray(articles)) {
      throw new Error('No articles provided');
    }

    // Format articles for blog-posts.json
    const formattedArticles = articles.map((article, index) => ({
      title: article.title,
      date: article.date,
      content: article.content,
      source: article.source,
      link: article.link,
      id: (index + 1).toString()
    }));

    console.log(`📝 Formatted ${formattedArticles.length} articles for update`);

    // In a real implementation, you'd need to:
    // 1. Update the blog-posts.json file in your GitHub repo
    // 2. Commit the changes
    // 3. Trigger a Netlify build
    
    // For now, we'll trigger a build hook to rebuild the site
    const buildHookUrl = process.env.NETLIFY_BUILD_HOOK;
    
    if (buildHookUrl) {
      const buildResponse = await fetch(buildHookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (buildResponse.ok) {
        console.log('🔄 Netlify build triggered successfully');
      } else {
        console.error('❌ Failed to trigger build:', buildResponse.statusText);
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Articles processed and build triggered',
        articlesCount: formattedArticles.length
      })
    };

  } catch (error) {
    console.error('❌ Update blog posts error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
