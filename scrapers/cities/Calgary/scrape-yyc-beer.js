/**
 * YYC Beer Events Scraper
 * URL: https://www.yycbeer.ca/events
 * Has real event images
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape(city = 'Calgary') {
  console.log('🍺 Scraping YYC Beer events...');

  try {
    const response = await axios.get('https://www.yycbeer.ca/events', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenImages = new Set();

    $('img[src*="wixstatic"], img[src*="/images/"]').each((i, el) => {
      const src = $(el).attr('src');
      if (!src || seenImages.has(src)) return;
      if (/logo|icon|check|forsale/i.test(src)) return;
      
      seenImages.add(src);
      const alt = $(el).attr('alt') || 'YYC Beer Event';
      
      // Extract date from alt text or skip
      const dateMatch = alt.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:[,\s]+(\d{4}))?/i);
      if (!dateMatch) return; // Skip events without real dates
      
      const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
      const month = months[dateMatch[1].toLowerCase().slice(0,3)];
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3] || (parseInt(month) < new Date().getMonth() + 1 ? '2026' : '2025');
      const eventDate = `${year}-${month}-${day}`;
      
      events.push({
        id: uuidv4(),
        title: alt.length > 3 ? alt.substring(0, 100) : 'Calgary Beer Festival',
        date: eventDate,
        url: 'https://www.yycbeer.ca/events',
        image: src.startsWith('http') ? src : 'https://www.yycbeer.ca' + src,
        imageUrl: src.startsWith('http') ? src : 'https://www.yycbeer.ca' + src,
        venue: {
          name: 'YYC Beer Events',
          address: 'Various Locations, Calgary, AB',
          city: 'Calgary'
        },
        city: 'Calgary',
        category: 'Food & Drink',
        source: 'YYC Beer'
      });
    });

    console.log(`✅ YYC Beer: ${events.length} events with images`);
    return events;

  } catch (error) {
    console.error('  ⚠️ YYC Beer error:', error.message);
    return [];
  }
}

module.exports = scrape;
