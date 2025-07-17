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

    // TODO: To implement full automation, you'd need to:
    // 1. Get current blog-posts.json from GitHub API
    // 2. Update the content
    // 3. Commit back to GitHub
    // 4. This would automatically trigger Netlify rebuild
    
    /* 
    Example GitHub API integration:
    
    const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_OWNER } = process.env;
    
    // Get current file
    const fileResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/src/data/blog-posts.json`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    const fileData = await fileResponse.json();
    
    // Update file
    const updateResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/src/data/blog-posts.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Update blog posts - ${new Date().toLocaleDateString()}`,
          content: Buffer.from(JSON.stringify(formattedArticles, null, 2)).toString('base64'),
          sha: fileData.sha
        })
      }
    );
    */
    
    // For now, just trigger a build
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
        message: 'Webhook processed successfully',
        articlesCount: formattedArticles.length,
        articles: formattedArticles
      })
    };

  } catch (error) {
    console.error('❌ Webhook error:', error);
    
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
