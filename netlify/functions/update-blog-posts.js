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

    // GitHub API integration for automatic file updates
    const { GITHUB_TOKEN, GITHUB_REPO = 'run-report', GITHUB_OWNER = 'smallnumbers0' } = process.env;
    
    let finalArticles = [];
    
    if (GITHUB_TOKEN) {
      try {
        // Get current file to merge with existing articles
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
          
          // Decode existing articles
          let existingArticles = [];
          try {
            const existingContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
            existingArticles = JSON.parse(existingContent);
            console.log(`📚 Found ${existingArticles.length} existing articles`);
          } catch (parseError) {
            console.log('📝 No existing articles found, starting fresh');
            existingArticles = [];
          }
          
          // Format new articles
          const newFormattedArticles = articles.map((article) => ({
            title: article.title,
            date: article.date,
            content: article.content,
            source: article.source,
            link: article.link,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9) // Unique ID
          }));
          
          // Combine existing and new articles
          const allArticles = [...newFormattedArticles, ...existingArticles];
          
          // Sort by date (newest first) and limit to 10 articles
          finalArticles = allArticles
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10)
            .map((article, index) => ({
              ...article,
              id: (index + 1).toString() // Reassign sequential IDs
            }));
          
          console.log(`📝 Final article count: ${finalArticles.length} (added ${newFormattedArticles.length} new, keeping 10 most recent)`);
          
          // Update file with merged articles
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
                message: `Update blog posts - ${new Date().toLocaleDateString()} (${newFormattedArticles.length} new articles, ${finalArticles.length} total)`,
                content: Buffer.from(JSON.stringify(finalArticles, null, 2)).toString('base64'),
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
                articlesCount: finalArticles.length,
                newArticles: newFormattedArticles.length,
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
    
    // Fallback formatting if GitHub API not available
    if (finalArticles.length === 0) {
      finalArticles = articles.map((article, index) => ({
        title: article.title,
        date: article.date,
        content: article.content,
        source: article.source,
        link: article.link,
        id: (index + 1).toString()
      }));
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
        articlesCount: finalArticles.length,
        method: 'build-hook',
        articles: finalArticles
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
