/**
 * Theatre Calgary Events Scraper
 * URL: https://www.theatrecalgary.com/shows-tickets/
 * Has real event images
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape(city = 'Calgary') {
  console.log('🎭 Scraping Theatre Calgary events...');

  try {
    const response = await axios.get('https://www.theatrecalgary.com/shows/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenTitles = new Set();

    // Find show cards
    $('article, .show, [class*="show"], .card, a[href*="/shows/"]').each((i, el) => {
      const $e = $(el);
      
      let title = $e.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      if (!title || title.length < 3) return;
      
      // Skip junk
      if (/menu|filter|search|login|ticket/i.test(title)) return;
      
      const titleKey = title.toLowerCase().replace(/[^a-z]/g, '');
      if (seenTitles.has(titleKey)) return;
      seenTitles.add(titleKey);

      let url = $e.attr('href') || $e.find('a').first().attr('href');
      if (url && !url.startsWith('http')) {
        url = 'https://www.theatrecalgary.com' + url;
      }

      let image = null;
      const img = $e.find('img').first();
      if (img.length) {
        image = img.attr('src') || img.attr('data-src');
        if (image && !image.startsWith('http')) {
          image = 'https://www.theatrecalgary.com' + image;
        }
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
          url: url || 'https://www.theatrecalgary.com/shows-tickets/',
          image: image,
          imageUrl: image,
          venue: {
            name: 'Theatre Calgary',
            address: '220 9 Ave SE, Calgary, AB T2G 5C4',
            city: 'Calgary'
          },
          city: 'Calgary',
          category: 'Arts & Theatre',
          source: 'Theatre Calgary'
        });
      }
    });

    // Fetch dates from individual show pages
    for (const event of events) {
      if (event.url && event.url.includes('/shows/')) {
        try {
          const showPage = await axios.get(event.url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 8000
          });
          const $s = cheerio.load(showPage.data);
          
          // Get date
          const dateText = $s('.date, [class*="date"], time').first().text().trim();
          const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/i);
          if (dateMatch) {
            const months = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
            const month = months[dateMatch[1].toLowerCase().slice(0,3)];
            const day = parseInt(dateMatch[2]);
            const year = month < new Date().getMonth() ? 2026 : 2025;
            event.date = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          }
          
          // Get better image
          const ogImage = $s('meta[property="og:image"]').attr('content');
          if (ogImage && !ogImage.includes('logo')) {
            event.image = ogImage;
            event.imageUrl = ogImage;
          }
        } catch (e) {}
      }
    }

    console.log(`✅ Theatre Calgary: ${events.length} events with images`);
    return events;

  } catch (error) {
    console.error('  ⚠️ Theatre Calgary error:', error.message);
    return [];
  }
}

module.exports = scrape;
