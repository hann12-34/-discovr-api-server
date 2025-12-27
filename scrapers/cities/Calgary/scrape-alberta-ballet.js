/**
 * Alberta Ballet Events Scraper
 * URL: https://www.albertaballet.com/performances
 * Has real event images
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape(city = 'Calgary') {
  console.log('🩰 Scraping Alberta Ballet events...');

  try {
    const response = await axios.get('https://www.albertaballet.com/performances', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenTitles = new Set();

    $('a[href*="/performance"], article, .performance, [class*="performance"], .show, .card').each((i, el) => {
      const $e = $(el);
      
      let title = $e.find('h1, h2, h3, h4, .title').first().text().trim();
      if (!title) title = $e.text().trim().split('\n')[0].trim();
      if (!title || title.length < 3 || title.length > 100) return;
      
      if (/menu|filter|search|login|ticket|buy|view/i.test(title)) return;
      
      const titleKey = title.toLowerCase().replace(/[^a-z]/g, '');
      if (seenTitles.has(titleKey)) return;
      seenTitles.add(titleKey);

      let url = $e.attr('href') || $e.find('a').first().attr('href');
      if (url && !url.startsWith('http')) {
        url = 'https://www.albertaballet.com' + url;
      }

      let image = null;
      const img = $e.find('img').first();
      if (img.length) {
        image = img.attr('src') || img.attr('data-src');
        if (image && /logo|icon|placeholder/i.test(image)) {
          image = null;
        }
      }

      // Extract date from element text
      const dateText = $e.text();
      const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:[,\s]+(\d{4}))?/i);
      let eventDate = null;
      if (dateMatch) {
        const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
        const month = months[dateMatch[1].toLowerCase().slice(0,3)];
        const day = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3] || (parseInt(month) < new Date().getMonth() + 1 ? '2026' : '2025');
        eventDate = `${year}-${month}-${day}`;
      }
      
      if (title && image && eventDate) {
        events.push({
          id: uuidv4(),
          title: title.substring(0, 100),
          date: eventDate,
          url: url || 'https://www.albertaballet.com/performances',
          image: image,
          imageUrl: image,
          venue: {
            name: 'Alberta Ballet',
            address: '141 18 Ave SW, Calgary, AB T2S 0B8',
            city: 'Calgary'
          },
          city: 'Calgary',
          category: 'Arts & Theatre',
          source: 'Alberta Ballet'
        });
      }
    });

    // Fetch dates from pages
    for (const event of events) {
      if (event.url && event.url.includes('/performance')) {
        try {
          const page = await axios.get(event.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
          const $p = cheerio.load(page.data);
          
          const ogImage = $p('meta[property="og:image"]').attr('content');
          if (ogImage && !ogImage.includes('logo')) {
            event.image = ogImage;
            event.imageUrl = ogImage;
          }
          
          const dateText = $p('.date, [class*="date"], time').first().text().trim();
          const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/i);
          if (dateMatch) {
            const months = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
            const month = months[dateMatch[1].toLowerCase().slice(0,3)];
            const day = parseInt(dateMatch[2]);
            const year = month < new Date().getMonth() ? 2026 : 2025;
            event.date = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          }
        } catch (e) {}
      }
    }

    console.log(`✅ Alberta Ballet: ${events.length} events with images`);
    return events;

  } catch (error) {
    console.error('  ⚠️ Alberta Ballet error:', error.message);
    return [];
  }
}

module.exports = scrape;
