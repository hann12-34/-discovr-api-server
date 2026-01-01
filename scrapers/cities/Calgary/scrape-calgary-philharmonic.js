/**
 * Calgary Philharmonic Events Scraper
 * URL: https://calgaryphil.com/concerts
 * Has real event images
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape(city = 'Calgary') {
  console.log('🎻 Scraping Calgary Philharmonic events...');

  try {
    const response = await axios.get('https://calgaryphil.com/concerts', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenTitles = new Set();

    // Find concert cards/links
    $('a[href*="/concerts/"], article, .concert, [class*="concert"], .event-card').each((i, el) => {
      const $e = $(el);
      
      let title = $e.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      if (!title) title = $e.text().trim().split('\n')[0].trim();
      if (!title || title.length < 5 || title.length > 100) return;
      
      // Skip junk
      if (/menu|filter|search|login|ticket|buy|view all/i.test(title)) return;
      
      const titleKey = title.toLowerCase().replace(/[^a-z]/g, '');
      if (seenTitles.has(titleKey)) return;
      seenTitles.add(titleKey);

      let url = $e.attr('href') || $e.find('a').first().attr('href');
      if (url && !url.startsWith('http')) {
        url = 'https://calgaryphil.com' + url;
      }

      let image = null;
      const img = $e.find('img').first();
      if (img.length) {
        image = img.attr('src') || img.attr('data-src');
        if (image && /logo|icon|placeholder/i.test(image)) {
          image = null;
        }
      }

      if (title && (url || image)) {
        events.push({
          id: uuidv4(),
          title: title.substring(0, 100),
          url: url,
          image: image,
          imageUrl: image,
          venue: {
            name: 'Calgary Philharmonic Orchestra',
            address: '205 8 Ave SE, Calgary, AB T2G 0K9',
            city: 'Calgary'
          },
          city: 'Calgary',
          category: 'Music',
          source: 'Calgary Philharmonic'
        });
      }
    });

    // Fetch dates and better images from individual pages
    for (const event of events) {
      if (event.url && event.url.includes('/concerts/')) {
        try {
          const page = await axios.get(event.url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 8000
          });
          const $p = cheerio.load(page.data);
          
          // Get og:image
          const ogImage = $p('meta[property="og:image"]').attr('content');
          if (ogImage && !ogImage.includes('logo')) {
            event.image = ogImage;
            event.imageUrl = ogImage;
          }
          
          // Get date
          const dateText = $p('.date, [class*="date"], time').first().text().trim();
          const dateMatch = dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s*(\d{4})?/i);
          if (dateMatch) {
            const months = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
            const month = months[dateMatch[1].toLowerCase().slice(0,3)];
            const day = parseInt(dateMatch[2]);
            const year = dateMatch[3] ? parseInt(dateMatch[3]) : (month < new Date().getMonth() ? 2026 : 2025);
            event.date = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          }
        } catch (e) {}
      }
      
      // No default date - skip events without real dates
    }

    // Only return events with images AND real dates
    const withImages = events.filter(e => e.image && e.date);
    console.log(`✅ Calgary Philharmonic: ${withImages.length} events with images`);
    return withImages;

  } catch (error) {
    console.error('  ⚠️ Calgary Philharmonic error:', error.message);
    return [];
  }
}

module.exports = scrape;
