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
  },
  {
    url: 'https://www.letsrun.com/',
    name: 'LetsRun',
    selector: 'h2 a, h3 a, .headline a, .story-title a'
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
        
        console.log(`📄 Article: "${title.substring(0, 50)}..."`);

        articles.push({
          title: title,
          link: link,
          source: source.name
        });
      }
    });
    
    console.log(`✅ Found ${articles.length} articles from ${source.name}`);
    return articles.slice(0, 3);
    
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
      model: 'gpt-4o-mini', 
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

Return only valid JSON with this format:
{
  "title": "Original article title",
  "date": "${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}",
  "content": "4-5 sentences of engaging summary based on the article",
  "source": "${article.source}",
  "link": "${article.link}"
}`
        }
      ],
      temperature: 0.5,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON in response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

async function updateContentWithWebhook(newsEntry, webhookUrl) {

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
    

    const articlePromises = NEWS_SOURCES.map(fetchNewsContent);
    const articleSets = await Promise.all(articlePromises);
    const allArticles = articleSets.flat().filter(article => article);
    
    if (allArticles.length === 0) {
      throw new Error('No articles found from any source');
    }
    
    console.log(`📊 Found ${allArticles.length} total articles`);
    

    const prioritySources = ['The New York Times', 'Runner\'s World', 'FloTrack', 'Running USA', 'LetsRun'];
    
   
    const priorityArticles = allArticles.filter(article => 
      prioritySources.includes(article.source) && 
      !article.title.toLowerCase().includes('air quality') &&
      !article.title.toLowerCase().includes('subscribe') &&
      !article.title.toLowerCase().includes('youtube') &&
      !article.title.toLowerCase().includes('follow us') &&
      !article.title.toLowerCase().includes('newsletter') &&
      !article.title.toLowerCase().includes('sign up') &&
      !article.title.toLowerCase().includes('join our') &&
      !article.link.includes('7882230-subscribe-to-our-youtube-channel') // Block specific article
    );
    
 
    const otherArticles = allArticles.filter(article => 
      !prioritySources.includes(article.source) &&
      !article.title.toLowerCase().includes('air quality') &&
      !article.title.toLowerCase().includes('weather') &&
      !article.title.toLowerCase().includes('forecast') &&
      !article.title.toLowerCase().includes('subscribe') &&
      !article.title.toLowerCase().includes('youtube') &&
      !article.title.toLowerCase().includes('follow us') &&
      !article.title.toLowerCase().includes('newsletter') &&
      !article.title.toLowerCase().includes('sign up') &&
      !article.title.toLowerCase().includes('join our') &&
      !article.link.includes('7882230-subscribe-to-our-youtube-channel') // Block specific article
    );
    
  
    const candidateArticles = [...priorityArticles, ...otherArticles];
    
    // Remove duplicates from candidate articles based on title and link
    const uniqueCandidates = candidateArticles.filter((article, index, self) => {
      return index === self.findIndex((a) => 
        a.title.toLowerCase().trim() === article.title.toLowerCase().trim() || 
        a.link === article.link
      );
    });
    
    console.log(`🔍 Removed ${candidateArticles.length - uniqueCandidates.length} duplicate candidates`);
    
    // Select up to 3 articles from different sources to ensure diversity
    const selectedArticles = [];
    const usedSources = new Set();
    
    for (const article of uniqueCandidates) {
      if (selectedArticles.length >= 3) break;
      if (!usedSources.has(article.source)) {
        selectedArticles.push(article);
        usedSources.add(article.source);
      }
    }
    
    // If we don't have 3 articles from different sources, fill with remaining articles
    if (selectedArticles.length < 3) {
      for (const article of uniqueCandidates) {
        if (selectedArticles.length >= 3) break;
        if (!selectedArticles.some(selected => selected.link === article.link)) {
          selectedArticles.push(article);
        }
      }
    } 
    
    console.log(`🎯 Selected ${selectedArticles.length} articles for processing`);
    
    console.log('🤖 Creating summaries with OpenAI...');
    const newsEntries = await Promise.all(
      selectedArticles.map(article => generateNewsWithOpenAI(article, OPENAI_API_KEY))
    );
    
    console.log(`📝 Generated ${newsEntries.length} entries:`, newsEntries.map(entry => entry.title));
    
    // Call the blog update webhook function
    try {
      const updateResponse = await fetch(`${process.env.URL || 'https://run-report.netlify.app'}/.netlify/functions/update-blog-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          articles: newsEntries
        })
      });
      
      if (updateResponse.ok) {
        console.log('🔄 Blog posts update webhook triggered successfully');
      } else {
        console.error('❌ Failed to trigger blog update:', updateResponse.statusText);
      }
    } catch (webhookError) {
      console.error('❌ Webhook error:', webhookError.message);
    }
    
    // Legacy webhook support
    if (WEBHOOK_URL) {
      await Promise.all(
        newsEntries.map(entry => updateContentWithWebhook(entry, WEBHOOK_URL))
      );
      console.log('🔄 Triggered legacy webhook');
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        articles: newsEntries, 
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
