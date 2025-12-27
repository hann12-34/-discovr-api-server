/**
 * Quickdraw Animation Calgary Events Scraper
 * URL: https://www.quickdrawanimation.ca/
 * Has real event images from Prismic
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape(city = 'Calgary') {
  console.log('🎬 Scraping Quickdraw Animation events...');

  try {
    const response = await axios.get('https://www.quickdrawanimation.ca/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenImages = new Set();

    $('img[src*="prismic.io"], img[srcset*="prismic.io"]').each((i, el) => {
      let src = $(el).attr('src');
      if (!src || src.includes('base64')) {
        const srcset = $(el).attr('srcset');
        if (srcset) {
          const match = srcset.match(/https:\/\/images\.prismic\.io\/[^\s]+\.jpg/);
          if (match) src = match[0];
        }
      }
      if (!src || seenImages.has(src)) return;
      if (/logo|icon/i.test(src)) return;
      
      seenImages.add(src);
      const alt = $(el).attr('alt') || 'Quickdraw Animation Event';
      
      // Extract date from alt or skip
      const dateMatch = alt.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:[,\s]+(\d{4}))?/i);
      if (!dateMatch) return; // Skip events without real dates
      
      const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
      const month = months[dateMatch[1].toLowerCase().slice(0,3)];
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3] || (parseInt(month) < new Date().getMonth() + 1 ? '2026' : '2025');
      const eventDate = `${year}-${month}-${day}`;
      
      events.push({
        id: uuidv4(),
        title: alt.length > 5 ? alt.substring(0, 100) : 'Quickdraw Animation Screening',
        date: eventDate,
        url: 'https://www.quickdrawanimation.ca/',
        image: src,
        imageUrl: src,
        venue: {
          name: 'Quickdraw Animation Society',
          address: '2011 10 Ave SW, Calgary, AB T3C 0K4',
          city: 'Calgary'
        },
        city: 'Calgary',
        category: 'Arts & Film',
        source: 'Quickdraw Animation'
      });
    });

    console.log(`✅ Quickdraw Animation: ${events.length} events with images`);
    return events;

  } catch (error) {
    console.error('  ⚠️ Quickdraw Animation error:', error.message);
    return [];
  }
}

module.exports = scrape;
