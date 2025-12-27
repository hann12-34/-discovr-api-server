/**
 * Fever Calgary Events Scraper
 * URL: https://feverup.com/calgary
 * Has real event images
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape(city = 'Calgary') {
  console.log('🎟️ Scraping Fever Calgary events...');

  try {
    const response = await axios.get('https://feverup.com/calgary', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenTitles = new Set();

    // Fever event cards
    $('[class*="card"], [class*="event"], article, a[href*="/plan/"]').each((i, el) => {
      const $event = $(el);

      // Extract title
      let title = $event.find('h1, h2, h3, h4, [class*="title"], [class*="name"]').first().text().trim();
      if (!title || title.length < 5) return;
      
      // Skip duplicates and junk
      const titleLower = title.toLowerCase();
      if (seenTitles.has(titleLower)) return;
      if (/menu|login|sign|filter|search|cookie/i.test(title)) return;
      seenTitles.add(titleLower);

      // Extract URL
      let eventUrl = $event.attr('href') || $event.find('a[href*="/plan/"]').first().attr('href');
      if (eventUrl && !eventUrl.startsWith('http')) {
        eventUrl = 'https://feverup.com' + eventUrl;
      }

      // Extract image from data-src (lazy loaded)
      let imageUrl = null;
      const img = $event.find('img').first();
      if (img.length) {
        imageUrl = img.attr('data-src') || img.attr('src');
        // Skip base64 placeholder images
        if (imageUrl && imageUrl.startsWith('data:')) {
          imageUrl = img.attr('data-src');
        }
        // Make sure it's a real Fever image
        if (imageUrl && imageUrl.includes('feverup.com')) {
          // Get larger image
          imageUrl = imageUrl.replace(/w_\d+,h_\d+/, 'w_600,h_400');
        } else {
          imageUrl = null;
        }
      }

      if (title && eventUrl && imageUrl) {
        events.push({
          id: uuidv4(),
          title: title,
          date: null, // Will be fetched from event page
          url: eventUrl,
          image: imageUrl,
          imageUrl: imageUrl,
          venue: {
            name: 'Fever Calgary',
            address: 'Calgary, AB',
            city: 'Calgary'
          },
          city: 'Calgary',
          category: 'Entertainment',
          source: 'Fever'
        });
      }
    });

    // Fetch dates from individual event pages
    for (const event of events.slice(0, 20)) { // Limit to 20 to avoid rate limiting
      if (event.url) {
        try {
          const eventPage = await axios.get(event.url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 8000
          });
          const $e = cheerio.load(eventPage.data);
          
          // Try to find date
          const dateText = $e('[class*="date"], time, [datetime]').first().text().trim();
          if (dateText) {
            const dateMatch = dateText.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
            if (dateMatch) {
              const months = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
              const day = parseInt(dateMatch[1]);
              const month = months[dateMatch[2].toLowerCase().slice(0,3)];
              const year = dateMatch[3] ? parseInt(dateMatch[3]) : (month < new Date().getMonth() ? 2026 : 2025);
              const date = new Date(year, month, day);
              if (!isNaN(date.getTime())) {
                event.date = date.toISOString().split('T')[0];
              }
            }
          }
          
          // Get better image from og:image
          const ogImage = $e('meta[property="og:image"]').attr('content');
          if (ogImage && ogImage.includes('feverup.com')) {
            event.image = ogImage;
            event.imageUrl = ogImage;
          }
          
          // Get venue if available
          const venueName = $e('[class*="venue"], [class*="location"]').first().text().trim();
          if (venueName && venueName.length > 3 && venueName.length < 100) {
            event.venue.name = venueName;
          }
        } catch (e) {
          // Skip if can't fetch
        }
      }
    }

    // Filter events with dates
    const validEvents = events.filter(e => e.date && e.image);
    
    console.log(`✅ Fever Calgary: ${validEvents.length} events with images`);
    return validEvents;

  } catch (error) {
    console.error('  ⚠️ Fever Calgary error:', error.message);
    return [];
  }
}

module.exports = scrape;
