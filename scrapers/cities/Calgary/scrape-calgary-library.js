/**
 * Calgary Public Library Events Scraper
 * URL: https://www.calgarylibrary.ca/events-and-programs/
 * Has real event images
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape(city = 'Calgary') {
  console.log('📚 Scraping Calgary Library events...');

  try {
    const response = await axios.get('https://www.calgarylibrary.ca/events-and-programs/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenImages = new Set();

    $('img[src*="/assets/"], img[src*="events"]').each((i, el) => {
      const src = $(el).attr('src');
      if (!src || !src.length || seenImages.has(src)) return;
      if (/logo|icon|placeholder/i.test(src)) return;
      
      seenImages.add(src);
      const alt = $(el).attr('alt') || '';
      
      // Extract title from filename or alt
      let title = alt;
      if (!title || title.length < 3) {
        const match = src.match(/\/([^\/]+)\.(jpg|png|jpeg)/i);
        if (match) {
          title = match[1].replace(/__.*$/, '').replace(/-/g, ' ').replace(/_/g, ' ');
        }
      }
      
      // Extract date from title or skip
      const dateMatch = title.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:[,\s]+(\d{4}))?/i);
      if (!dateMatch) return; // Skip events without real dates
      
      const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
      const month = months[dateMatch[1].toLowerCase().slice(0,3)];
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3] || (parseInt(month) < new Date().getMonth() + 1 ? '2026' : '2025');
      const eventDate = `${year}-${month}-${day}`;
      
      if (title && title.length > 3) {
        const fullSrc = src.startsWith('http') ? src : 'https://www.calgarylibrary.ca' + src;
        events.push({
          id: uuidv4(),
          title: title.substring(0, 100),
          date: eventDate,
          url: 'https://www.calgarylibrary.ca/events-and-programs/',
          image: fullSrc,
          imageUrl: fullSrc,
          venue: {
            name: 'Calgary Public Library',
            address: '616 Macleod Trail SE, Calgary, AB T2G 2M2',
            city: 'Calgary'
          },
          city: 'Calgary',
          category: 'Community',
          source: 'Calgary Library'
        });
      }
    });

    console.log(`✅ Calgary Library: ${events.length} events with images`);
    return events;

  } catch (error) {
    console.error('  ⚠️ Calgary Library error:', error.message);
    return [];
  }
}

module.exports = scrape;
