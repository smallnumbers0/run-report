import { handler as dailyNewsHandler } from './daily-news-scraper.js';

export const handler = async (event, context) => {
  // Manual trigger for the news scraper
  return await dailyNewsHandler(event, context);
};
