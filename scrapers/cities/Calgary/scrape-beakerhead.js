/**
 * Beakerhead Calgary Events Scraper
 * URL: https://www.beakerhead.com/
 * Has real event images from Telus Spark
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape(city = 'Calgary') {
  console.log('🔬 Scraping Beakerhead events...');

  try {
    const response = await axios.get('https://www.beakerhead.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenImages = new Set();

    // Find images from Prismic CDN (real event images)
    $('img[src*="prismic.io"], img[src*="telusspark"]').each((i, el) => {
      const src = $(el).attr('src');
      if (!src || seenImages.has(src)) return;
      if (/logo|icon|facebook|ticket/i.test(src)) return;
      
      seenImages.add(src);
      const alt = $(el).attr('alt') || 'Beakerhead Event';
      
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
        title: alt.length > 5 ? alt.substring(0, 100) : 'Beakerhead Festival Event',
        date: eventDate,
        url: 'https://www.beakerhead.com/',
        image: src,
        imageUrl: src,
        venue: {
          name: 'Beakerhead Festival',
          address: 'Various Locations, Calgary, AB',
          city: 'Calgary'
        },
        city: 'Calgary',
        category: 'Festival',
        source: 'Beakerhead'
      });
    });

    console.log(`✅ Beakerhead: ${events.length} events with images`);
    return events;

  } catch (error) {
    console.error('  ⚠️ Beakerhead error:', error.message);
    return [];
  }
}

module.exports = scrape;
