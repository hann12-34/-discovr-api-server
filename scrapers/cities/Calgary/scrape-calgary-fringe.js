/**
 * Calgary Fringe Festival Events Scraper
 * URL: https://www.calgaryfringe.ca/
 * Has real event images from Squarespace
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape(city = 'Calgary') {
  console.log('🎭 Scraping Calgary Fringe events...');

  try {
    const response = await axios.get('https://www.calgaryfringe.ca/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenImages = new Set();

    $('img[src*="squarespace-cdn"], img[data-src*="squarespace-cdn"]').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (!src || seenImages.has(src)) return;
      if (/logo|icon|gif$/i.test(src)) return;
      
      seenImages.add(src);
      const alt = $(el).attr('alt') || 'Calgary Fringe Event';
      
      // Extract date from alt text or skip
      const dateMatch = alt.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:[,\s]+(\d{4}))?/i);
      if (!dateMatch) return; // Skip events without real dates
      
      const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
      const month = months[dateMatch[1].toLowerCase().slice(0,3)];
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3] || (parseInt(month) < new Date().getMonth() + 1 ? '2026' : '2025');
      const eventDate = `${year}-${month}-${day}`;
      
      if (alt.length > 2) {
        events.push({
          id: uuidv4(),
          title: alt.replace(/\.(jpg|png|jpeg)$/i, '').replace(/\+/g, ' ').substring(0, 100),
          date: eventDate,
          url: 'https://www.calgaryfringe.ca/',
          image: src.startsWith('http') ? src : 'https:' + src,
          imageUrl: src.startsWith('http') ? src : 'https:' + src,
          venue: {
            name: 'Calgary Fringe Festival',
            address: 'Inglewood, Calgary, AB',
            city: 'Calgary'
          },
          city: 'Calgary',
          category: 'Festival',
          source: 'Calgary Fringe'
        });
      }
    });

    console.log(`✅ Calgary Fringe: ${events.length} events with images`);
    return events;

  } catch (error) {
    console.error('  ⚠️ Calgary Fringe error:', error.message);
    return [];
  }
}

module.exports = scrape;
