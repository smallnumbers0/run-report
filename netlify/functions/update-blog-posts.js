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

    // GitHub API integration for automatic file updates
    const { GITHUB_TOKEN, GITHUB_REPO = 'run-report', GITHUB_OWNER = 'smallnumbers0' } = process.env;
    
    if (GITHUB_TOKEN) {
      try {
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
        
        if (fileResponse.ok) {
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
          
          if (updateResponse.ok) {
            console.log('✅ Successfully updated blog-posts.json via GitHub API');
            
            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                success: true,
                message: 'Blog posts updated automatically via GitHub API',
                articlesCount: formattedArticles.length,
                method: 'github-api'
              })
            };
          } else {
            console.error('❌ Failed to update file:', updateResponse.statusText);
          }
        }
      } catch (githubError) {
        console.error('❌ GitHub API error:', githubError.message);
      }
    }
    
    // Fallback: trigger build hook if GitHub API fails or token not available
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
        message: 'Webhook processed - build triggered',
        articlesCount: formattedArticles.length,
        method: 'build-hook',
        articles: formattedArticles
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
