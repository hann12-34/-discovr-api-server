/**
 * Skyway Theatre Minneapolis Events Scraper
 * Premier music venue with multiple rooms
 * URL: https://skywaytheatre.com/calendar/list/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeSkywayTheatre(city = 'Minneapolis') {
  console.log('🎪 Scraping Skyway Theatre Minneapolis...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://skywaytheatre.com/calendar/list/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Scroll to load more events
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 1500));
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Get all event links
    const eventLinks = await page.evaluate(() => {
      const links = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="/event/"]').forEach(link => {
        const href = link.href;
        if (!href || seen.has(href) || !href.includes('skywaytheatre.com/event/')) return;
        seen.add(href);
        
        const title = link.textContent?.trim();
        if (title && title.length > 2 && !title.match(/^(buy|ticket|view|more)/i)) {
          links.push({ url: href, title });
        }
      });
      
      return links;
    });

    console.log(`  📋 Found ${eventLinks.length} event links, fetching details...`);

    const events = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    
    // Visit each event page
    for (const eventLink of eventLinks.slice(0, 30)) {
      try {
        await page.goto(eventLink.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(resolve => setTimeout(resolve, 1000));

        const eventData = await page.evaluate(() => {
          // Get date - look for various date formats
          let dateText = '';
          
          // Check for specific date elements
          const dateSelectors = ['.event-date', '.date', 'time', '[class*="date"]', '.tribe-events-schedule'];
          for (const sel of dateSelectors) {
            const el = document.querySelector(sel);
            if (el?.textContent) {
              dateText = el.textContent.trim();
              break;
            }
          }
          
          // Check meta tags
          if (!dateText) {
            const metaDate = document.querySelector('meta[property="event:start_time"]')?.content;
            if (metaDate) dateText = metaDate;
          }
          
          // Search page content for date pattern
          if (!dateText) {
            const bodyText = document.body.innerText;
            const dateMatch = bodyText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
            if (dateMatch) dateText = dateMatch[0];
          }
          
          // Get image
          const ogImage = document.querySelector('meta[property="og:image"]')?.content;
          const mainImage = document.querySelector('.event-image img, .wp-post-image, article img, .featured-image img')?.src;
          let imageUrl = ogImage || mainImage || null;
          
          // Filter out logos
          if (imageUrl && (imageUrl.includes('logo') || imageUrl.includes('placeholder') || imageUrl.includes('default') || imageUrl.includes('icon'))) {
            imageUrl = null;
          }
          
          // Get venue room
          const venueEl = document.querySelector('.venue-name, .event-venue, [class*="venue"]');
          const venueName = venueEl?.textContent?.trim() || 'Skyway Theatre';
          
          return { dateText, imageUrl, venueName };
        });

        // Parse date
        let isoDate = null;
        if (eventData.dateText) {
          // Try ISO format
          const isoMatch = eventData.dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (isoMatch) {
            isoDate = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
          } else {
            // Try "Jan 15, 2026" or "January 15 2026" format
            const dateMatch = eventData.dateText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
            if (dateMatch) {
              const month = months[dateMatch[1].toLowerCase().substring(0, 3)];
              const day = dateMatch[2].padStart(2, '0');
              const now = new Date();
              let year = dateMatch[3] || now.getFullYear().toString();
              
              if (!dateMatch[3] && parseInt(month) < now.getMonth() + 1) {
                year = (now.getFullYear() + 1).toString();
              }
              
              isoDate = `${year}-${month}-${day}`;
            }
          }
        }

        if (isoDate && new Date(isoDate) >= new Date()) {
          events.push({
            title: eventLink.title,
            date: isoDate,
            url: eventLink.url,
            imageUrl: eventData.imageUrl,
            venueName: eventData.venueName
          });
        }

      } catch (e) {
        // Skip failed pages
      }
    }

    await browser.close();

    const formattedEvents = events.map(event => ({
      id: uuidv4(),
      title: event.title,
      description: null,
      date: event.date,
      startDate: new Date(event.date + 'T21:00:00'),
      url: event.url,
      imageUrl: event.imageUrl,
      venue: {
        name: event.venueName || 'Skyway Theatre',
        address: '711 Hennepin Ave, Minneapolis, MN 55403',
        city: 'Minneapolis'
      },
      latitude: 44.9786,
      longitude: -93.2760,
      city: 'Minneapolis',
      category: 'Nightlife',
      source: 'Skyway Theatre'
    }));

    console.log(`  ✅ Found ${formattedEvents.length} Skyway Theatre events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Skyway Theatre error:', error.message);
    return [];
  }
}

module.exports = scrapeSkywayTheatre;
