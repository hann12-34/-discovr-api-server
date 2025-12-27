/**
 * LA Conservancy Events Scraper
 * URL: https://www.laconservancy.org/tours-events/event-calendar/
 * Uses Puppeteer to extract real event-specific images
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🏛️ Scraping LA Conservancy events...');
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.laconservancy.org/tours-events/event-calendar/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Extract events with their specific images from the listing page
    const rawEvents = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Find all event cards/links with images
      document.querySelectorAll('a[href*="/tours-events/events-calendar/"]').forEach(a => {
        const href = a.href;
        if (!href || seen.has(href)) return;
        
        // Extract date from URL
        const dateMatch = href.match(/(\d{4}-\d{2}-\d{2})/);
        if (!dateMatch) return;
        
        seen.add(href);
        
        // Find image associated with this event - look in parent containers
        let imgSrc = null;
        const card = a.closest('div') || a.parentElement;
        if (card) {
          const img = card.querySelector('img');
          if (img) {
            imgSrc = img.src || img.getAttribute('data-src');
          }
        }
        // Also check if the link itself contains an image
        if (!imgSrc) {
          const directImg = a.querySelector('img');
          if (directImg) {
            imgSrc = directImg.src || directImg.getAttribute('data-src');
          }
        }
        
        // Skip logos and placeholders
        if (imgSrc && (imgSrc.includes('logo') || imgSrc.includes('placeholder'))) {
          imgSrc = null;
        }
        
        // Extract title from URL
        const match = href.match(/events-calendar\/([^\/]+)/);
        if (!match) return;
        
        let title = match[1].replace(/-\d{4}-\d{2}-\d{2}.*$/, '').replace(/-/g, ' ');
        title = title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        if (title.length < 3) return;
        
        results.push({
          title: title,
          date: dateMatch[1],
          url: href,
          imageUrl: imgSrc
        });
      });
      
      return results;
    });
    
    await browser.close();
    
    // Format events
    for (const raw of rawEvents) {
      events.push({
        id: uuidv4(),
        title: raw.title.substring(0, 100),
        date: raw.date,
        startDate: new Date(raw.date + 'T10:00:00'),
        url: raw.url,
        image: raw.imageUrl,
        imageUrl: raw.imageUrl,
        venue: {
          name: 'LA Conservancy',
          address: '523 W 6th St #826, Los Angeles, CA 90014',
          city: 'Los Angeles'
        },
        city: 'Los Angeles',
        category: 'Museum',
        source: 'LA Conservancy'
      });
    }
    
  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️ LA Conservancy error:', error.message);
  }
  
  console.log(`✅ LA Conservancy: ${events.length} events, ${events.filter(e => e.imageUrl).length} with images`);
  return events;
}

module.exports = scrape;
