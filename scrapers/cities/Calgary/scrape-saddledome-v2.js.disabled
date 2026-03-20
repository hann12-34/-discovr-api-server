/**
 * Saddledome Calgary Scraper V2
 * Extracts actual Ticketmaster URLs which have real event images
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

async function scrape(city = 'Calgary') {
  console.log('🏟️ Scraping Saddledome events (V2 with Ticketmaster URLs)...');

  try {
    const response = await axios.get('https://www.scotiabanksaddledome.com/events', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    const seenUrls = new Set();

    // Find all Ticketmaster links with event info
    $('a[href*="ticketmaster.ca/"]').each((i, el) => {
      const $link = $(el);
      const url = $link.attr('href');
      
      if (!url || !url.includes('/event/') || seenUrls.has(url)) return;
      seenUrls.add(url);

      // Get title from link text or nearby elements
      let title = $link.text().trim();
      if (!title || title.length < 5) {
        title = $link.closest('div, li, article').find('h2, h3, h4, strong, .title').first().text().trim();
      }
      if (!title || title.length < 5) return;

      // Clean title
      title = title.split('\n')[0].trim();
      if (title.length > 100) title = title.substring(0, 97) + '...';

      // Extract date from URL or nearby text
      let eventDate = null;
      const dateMatch = url.match(/(\d{2})-(\d{2})-(\d{4})/);
      if (dateMatch) {
        eventDate = `${dateMatch[3]}-${dateMatch[1]}-${dateMatch[2]}`;
      }

      // Skip past events
      if (eventDate) {
        const eventDateObj = new Date(eventDate);
        if (eventDateObj < new Date()) return;
      }

      events.push({
        id: uuidv4(),
        title: title,
        date: eventDate,
        url: url,
        image: null, // Will be fetched from Ticketmaster
        imageUrl: null,
        venue: {
          name: 'Scotiabank Saddledome',
          address: '555 Saddledome Rise SE, Calgary, AB T2G 2W1',
          city: 'Calgary'
        },
        city: 'Calgary',
        category: 'Sports & Entertainment',
        source: 'Saddledome'
      });
    });

    // Fetch og:image from Ticketmaster URLs
    console.log(`   Fetching images from ${events.length} Ticketmaster URLs...`);
    let imagesFound = 0;
    
    for (const event of events) {
      if (event.url && event.url.includes('ticketmaster')) {
        try {
          const eventPage = await axios.get(event.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
          });
          const $e = cheerio.load(eventPage.data);
          
          // Get og:image
          const ogImage = $e('meta[property="og:image"]').attr('content');
          if (ogImage && !ogImage.includes('logo') && !ogImage.includes('default')) {
            event.image = ogImage;
            event.imageUrl = ogImage;
            imagesFound++;
          }

          // Get better date if available
          const dateEl = $e('[class*="date"], time[datetime]').first();
          if (dateEl.length) {
            const datetime = dateEl.attr('datetime');
            if (datetime) {
              try {
                const parsed = new Date(datetime);
                if (!isNaN(parsed.getTime())) {
                  event.date = parsed.toISOString().split('T')[0];
                }
              } catch (e) {}
            }
          }
        } catch (e) {
          // Skip if can't fetch
        }
      }
    }

    console.log(`   Found ${imagesFound}/${events.length} images from Ticketmaster`);

    // Filter valid events
    const validEvents = events.filter(e => e.date);
    
    console.log(`✅ Saddledome V2: ${validEvents.length} events, ${validEvents.filter(e => e.image).length} with images`);
    return validEvents;

  } catch (error) {
    console.error('  ⚠️ Saddledome V2 error:', error.message);
    return [];
  }
}

module.exports = scrape;
