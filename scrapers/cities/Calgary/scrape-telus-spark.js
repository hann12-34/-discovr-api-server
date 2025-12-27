/**
 * TELUS Spark Science Centre Events Scraper
 * Major Calgary science centre with events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape(city = 'Calgary') {
  console.log('🔭 Scraping TELUS Spark events...');

  try {
    const response = await axios.get('https://www.telusspark.ca/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenImages = new Set();

    // Find event images
    $('img[src*="prismic"], img[src*="telusspark"], img[src*="event"]').each((i, el) => {
      const src = $(el).attr('src');
      if (!src || seenImages.has(src)) return;
      if (/logo|icon|facebook|nav|menu/i.test(src)) return;
      
      seenImages.add(src);
      const alt = $(el).attr('alt') || 'TELUS Spark Event';
      
      // Extract date from alt or skip
      const dateMatch = alt.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:[,\s]+(\d{4}))?/i);
      if (!dateMatch) return; // Skip events without real dates
      
      const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
      const month = months[dateMatch[1].toLowerCase().slice(0,3)];
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3] || (parseInt(month) < new Date().getMonth() + 1 ? '2026' : '2025');
      const eventDate = `${year}-${month}-${day}`;
      
      if (alt.length > 3) {
        events.push({
          id: uuidv4(),
          title: alt.substring(0, 100),
          date: eventDate,
          url: 'https://www.telusspark.ca/',
          image: src.startsWith('http') ? src : 'https://www.telusspark.ca' + src,
          imageUrl: src.startsWith('http') ? src : 'https://www.telusspark.ca' + src,
          venue: {
            name: 'TELUS Spark Science Centre',
            address: '220 Saint George\'s Drive NE, Calgary, AB T2E 5T2',
            city: 'Calgary'
          },
          city: 'Calgary',
          category: 'Family',
          source: 'TELUS Spark'
        });
      }
    });

    console.log(`✅ TELUS Spark: ${events.length} events with images`);
    return events;

  } catch (error) {
    console.error('  ⚠️ TELUS Spark error:', error.message);
    return [];
  }
}

module.exports = scrape;
