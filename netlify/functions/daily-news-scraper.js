import * as cheerio from 'cheerio';

const NEWS_SOURCES = [
  {
    url: 'https://runningmagazine.ca/sections/news/',
    name: 'Running Magazine',
    selector: 'h2 a, h3 a, .entry-title a'
  },
  {
    url: 'https://www.flotrack.org',
    name: 'FloTrack',
    selector: 'a[href*="/articles/"], .content-card a, .story-card a, .article-card a, h2 a, h3 a'
  },
  {
    url: 'https://www.runningusa.org/RUSA/News/Latest_News/RUSA/News/LatestNews.aspx',
    name: 'Running USA',
    selector: 'h2 a, h3 a, .news-title a, .headline a'
  },
  {
    url: 'https://www.nytimes.com/topic/subject/running',
    name: 'The New York Times',
    selector: 'h3 a, .css-1kv6qi a, .story-wrapper h2 a, [data-testid="headline"] a'
  },
  {
    url: 'https://www.runnersworld.com/news',
    name: 'Runner\'s World',
    selector: 'h3 a, .headline a, .listicle-slide-hed a'
  }
];

async function fetchNewsContent(source) {
  try {
    console.log(`📡 Fetching from ${source.name}...`);
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const articles = [];
    $(source.selector).each((i, elem) => {
      const $elem = $(elem);
      const title = $elem.text().trim();
      let link = $elem.attr('href');
      
      if (title && link && title.length > 10) {
        if (link.startsWith('/')) {
          const baseUrl = new URL(source.url).origin;
          link = baseUrl + link;
        } else if (!link.startsWith('http')) {
          link = source.url + '/' + link;
        }
        
        // Try to find an associated image with more comprehensive selectors
        let imageUrl = null;
        
        // Try multiple strategies to find images
        const imageSelectors = [
          'img[src]',
          'img[data-src]', 
          'img[data-lazy-src]',
          'img[data-original]',
          '[style*="background-image"]'
        ];
        
        // Strategy 1: Look in closest article/card container
        const $parent = $elem.closest('article, .article, .post, .story, .card, .item, .entry, .content');
        if ($parent.length && !imageUrl) {
          for (const selector of imageSelectors) {
            const $img = $parent.find(selector).first();
            if ($img.length) {
              imageUrl = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src') || $img.attr('data-original');
              if (imageUrl) break;
            }
          }
        }
        
        // Strategy 2: Look for images in nearby siblings
        if (!imageUrl) {
          const $siblings = $elem.parent().siblings();
          for (const selector of imageSelectors) {
            const $img = $siblings.find(selector).first();
            if ($img.length) {
              imageUrl = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src') || $img.attr('data-original');
              if (imageUrl) break;
            }
          }
        }
        
        // Strategy 3: Look in parent container
        if (!imageUrl) {
          const $container = $elem.parent().parent();
          for (const selector of imageSelectors) {
            const $img = $container.find(selector).first();
            if ($img.length) {
              imageUrl = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src') || $img.attr('data-original');
              if (imageUrl) break;
            }
          }
        }
        
        // Strategy 4: Look for Open Graph or meta images in the page (fallback)
        if (!imageUrl) {
          const $ogImage = $('meta[property="og:image"]');
          if ($ogImage.length) {
            imageUrl = $ogImage.attr('content');
          }
        }
        
        // Clean up and validate image URL
        if (imageUrl) {
          // Handle relative URLs
          if (imageUrl.startsWith('/')) {
            const baseUrl = new URL(source.url).origin;
            imageUrl = baseUrl + imageUrl;
          } else if (!imageUrl.startsWith('http')) {
            const baseUrl = new URL(source.url).origin;
            imageUrl = baseUrl + '/' + imageUrl;
          }
          
          // Filter out unwanted images with more comprehensive checks
          const unwantedPatterns = [
            'logo', 'icon', 'avatar', 'profile', 'user', 'author',
            '1x1', 'placeholder', 'blank', 'spacer', 'pixel',
            'facebook', 'twitter', 'instagram', 'social',
            'advertisement', 'ad', 'banner', 'sponsor'
          ];
          
          const shouldFilter = unwantedPatterns.some(pattern => 
            imageUrl.toLowerCase().includes(pattern)
          );
          
          // Also check image dimensions in URL (filter out very small images)
          const hasSmallDimensions = /\/\d{1,2}x\d{1,2}\/|_\d{1,2}x\d{1,2}\.|\/\d{1,2}\/|\b\d{1,2}x\d{1,2}\b/.test(imageUrl);
           if (shouldFilter || hasSmallDimensions) {
            imageUrl = null;
          }
        }
        
        // Add fallback images if no image found
        if (!imageUrl) {
          // Use running-related stock images as fallbacks
          const fallbackImages = [
            'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', // Track running
            'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', // Marathon runners
            'https://images.unsplash.com/photo-1530549387789-4c1017266635?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', // Trail running
            'https://images.unsplash.com/photo-1568667256549-094345857637?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', // Running shoes
            'https://images.unsplash.com/photo-1526676037777-05a232d2ae80?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'  // Running track
          ];
          
          // Assign a consistent image based on article title hash
          const titleHash = title.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0);
          imageUrl = fallbackImages[Math.abs(titleHash) % fallbackImages.length];
        }
        
        console.log(`📸 Image for "${title.substring(0, 50)}...": ${imageUrl ? 'Found' : 'None'}`);

        articles.push({
          title: title,
          link: link,
          source: source.name,
          imageUrl: imageUrl
        });
      }
    });        // Add fallback images if no image found
        if (!imageUrl) {
          // Use running-related stock images as fallbacks
          const fallbackImages = [
            'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', // Track running
            'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', // Marathon runners
            'https://images.unsplash.com/photo-1530549387789-4c1017266635?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', // Trail running
            'https://images.unsplash.com/photo-1568667256549-094345857637?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', // Running shoes
            'https://images.unsplash.com/photo-1526676037777-05a232d2ae80?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'  // Running track
          ];
          
          // Assign a consistent image based on article title hash
          const titleHash = title.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0);
          imageUrl = fallbackImages[Math.abs(titleHash) % fallbackImages.length];
        }
        
        console.log(`📸 Image for "${title.substring(0, 50)}...": ${imageUrl ? 'Found' : 'None'}`);
    
  } catch (error) {
    console.error(`❌ Error fetching ${source.name}:`, error.message);
    return [];
  }
}

async function generateNewsWithOpenAI(article, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a running news summarizer. Create concise, engaging summaries for The Running Report.'
        },
        {
          role: 'user',
          content: `Create a JSON summary for this running news article:

Title: "${article.title}"
Source: ${article.source}
Link: ${article.link}
${article.imageUrl ? `Image: ${article.imageUrl}` : ''}

Return only valid JSON with this format:
{
  "title": "Original article title",
  "date": "${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}",
  "content": "2-3 sentence engaging summary based on the title",
  "source": "${article.source}",
  "link": "${article.link}"${article.imageUrl ? `,\n  "imageUrl": "${article.imageUrl}"` : ''}
}`
        }
      ],
      temperature: 0.3,
      max_tokens: 400
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON in response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

async function updateContentWithWebhook(newsEntry, webhookUrl) {
  // Trigger a rebuild with the new content
  // This would integrate with a headless CMS or git-based workflow
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'add_article',
      article: newsEntry,
      timestamp: new Date().toISOString()
    })
  });
  
  return response.ok;
}

export const handler = async (event, context) => {
  // Check if this is a scheduled function call
  if (event.httpMethod !== 'POST' && !event.isScheduled) {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { OPENAI_API_KEY, WEBHOOK_URL } = process.env;
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('🏃 Starting Netlify news scraper...');
    
    // Fetch articles from all sources
    const articlePromises = NEWS_SOURCES.map(fetchNewsContent);
    const articleSets = await Promise.all(articlePromises);
    const allArticles = articleSets.flat().filter(article => article);
    
    if (allArticles.length === 0) {
      throw new Error('No articles found from any source');
    }
    
    console.log(`📊 Found ${allArticles.length} total articles`);
    
    // Select 2 best articles
    const prioritySources = ['The New York Times', 'Runner\'s World', 'FloTrack', 'Running USA'];
    
    // Get high-priority articles first
    const priorityArticles = allArticles.filter(article => 
      prioritySources.includes(article.source) && 
      !article.title.toLowerCase().includes('air quality')
    );
    
    // Get other interesting articles (avoid air quality and generic titles)
    const otherArticles = allArticles.filter(article => 
      !prioritySources.includes(article.source) &&
      !article.title.toLowerCase().includes('air quality') &&
      !article.title.toLowerCase().includes('weather') &&
      !article.title.toLowerCase().includes('forecast')
    );
    
    // Combine and take best 2 articles
    const candidateArticles = [...priorityArticles, ...otherArticles];
    const selectedArticles = candidateArticles.slice(0, 2).length >= 2 
      ? candidateArticles.slice(0, 2) 
      : allArticles.slice(0, 2); // Fallback to any 2 articles if not enough candidates
    
    console.log(`🎯 Selected ${selectedArticles.length} articles for processing`);
    
    // Generate summaries with OpenAI for both articles
    console.log('🤖 Creating summaries with OpenAI...');
    const newsEntries = await Promise.all(
      selectedArticles.map(article => generateNewsWithOpenAI(article, OPENAI_API_KEY))
    );
    
    console.log(`📝 Generated ${newsEntries.length} entries:`, newsEntries.map(entry => entry.title));
    
    // If webhook URL is provided, trigger rebuild with both articles
    if (WEBHOOK_URL) {
      await Promise.all(
        newsEntries.map(entry => updateContentWithWebhook(entry, WEBHOOK_URL))
      );
      console.log('🔄 Triggered site rebuild with multiple articles');
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        articles: newsEntries, // Now returns array of articles
        articlesFound: allArticles.length,
        articlesProcessed: newsEntries.length
      })
    };
    
  } catch (error) {
    console.error('❌ News scraper error:', error);
    
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
