/**
 * Jubilee Auditorium Calgary - Custom Scraper V2
 * Has real event images with known dates
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

// No hardcoded dates - extract real dates from page only

async function scrape(city = 'Calgary') {
  console.log('🎭 Scraping Jubilee Auditorium events V2...');

  try {
    const response = await axios.get('https://www.jubileeauditorium.com/calgary/whats-on', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenTitles = new Set();

    // Find event cards
    $('article, .event, [class*="event"], .card, a[href*="/event"]').each((i, el) => {
      const $e = $(el);
      
      // Get title
      let title = $e.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
      if (!title || title.length < 5) return;
      
      // Skip junk
      if (/menu|what's on|get tickets|calendar|filter/i.test(title)) return;
      
      // Dedupe
      const titleKey = title.toLowerCase().replace(/[^a-z]/g, '');
      if (seenTitles.has(titleKey)) return;
      seenTitles.add(titleKey);

      // Get URL
      let url = $e.attr('href') || $e.find('a').first().attr('href');
      if (url && !url.startsWith('http')) {
        url = 'https://www.jubileeauditorium.com' + url;
      }

      // Get image
      let imageUrl = null;
      const img = $e.find('img').first();
      if (img.length) {
        imageUrl = img.attr('src') || img.attr('data-src');
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = 'https://www.jubileeauditorium.com' + imageUrl;
        }
        if (imageUrl && /logo|icon|placeholder/i.test(imageUrl)) {
          imageUrl = null;
        }
      }

      // Get date text
      let dateText = $e.find('.date, [class*="date"], time').first().text().trim();
      
      events.push({
        id: uuidv4(),
        title: title.substring(0, 100),
        dateText: dateText,
        url: url,
        image: imageUrl,
        imageUrl: imageUrl,
        venue: {
          name: 'Southern Alberta Jubilee Auditorium',
          address: '1415 14 Ave NW, Calgary, AB T2N 1M4',
          city: 'Calgary'
        },
        city: 'Calgary',
        category: 'Arts & Entertainment',
        source: 'Jubilee Auditorium'
      });
    });

    // Extract real dates from event pages - no hardcoded dates

    // Fetch og:image from individual event pages
    console.log(`   Fetching images from ${events.length} event pages...`);
    
    for (const event of events) {
      if (event.url && event.url.includes('/event')) {
        try {
          const eventPage = await axios.get(event.url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 8000
          });
          const $e = cheerio.load(eventPage.data);
          
          // Get og:image and set BOTH image and imageUrl
          const ogImage = $e('meta[property="og:image"]').attr('content');
          if (ogImage && !ogImage.includes('logo')) {
            event.image = ogImage;
            event.imageUrl = ogImage;
          }
          
          // Also check for images in the page if no og:image
          if (!event.image) {
            const pageImg = $e('img[src*="event"], img[src*="banner"], .event-image img').first().attr('src');
            if (pageImg && !pageImg.includes('logo')) {
              event.image = pageImg.startsWith('http') ? pageImg : 'https://www.jubileeauditorium.com' + pageImg;
              event.imageUrl = event.image;
            }
          }
          
          // Get date from event page
          const dateEl = $e('.event-date, [class*="date"], time[datetime]').first();
          let fullDate = dateEl.attr('datetime') || dateEl.text().trim();
          
          // Parse date from page - no hardcoded fallbacks
          if (!event.date) {
            const dateMatch = fullDate.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s*(\d{4})/i);
            if (dateMatch) {
              const months = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
              const month = months[dateMatch[1].toLowerCase().slice(0,3)];
              const day = parseInt(dateMatch[2]);
              const year = parseInt(dateMatch[3]);
              event.date = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            }
          }
        } catch (e) {
          // Skip failed
        }
      }
    }

    // Filter valid events - must have real date
    const validEvents = events.filter(e => e.date);
    const withImages = validEvents.filter(e => e.image || e.imageUrl).length;
    
    console.log(`✅ Jubilee V2: ${validEvents.length} events, ${withImages} with images`);
    return validEvents;

  } catch (error) {
    console.error('  ⚠️ Jubilee V2 error:', error.message);
    return [];
  }
}

module.exports = scrape;
