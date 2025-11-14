/**
 * Avant Gardner / Brooklyn Mirage Events Scraper (Puppeteer)
 * Modern headless browser scraper for JavaScript-heavy sites
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrape() {
  console.log('🎪 Scraping Avant Gardner with Puppeteer...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.avantgardner.com/events', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for events to load
    await page.waitForSelector('article, .event, [class*="event"]', { timeout: 10000 }).catch(() => {});
    
    // Extract events
    const events = await page.evaluate(() => {
      const results = [];
      const items = document.querySelectorAll('article, .event-card, .show-item, [class*="event-item"]');
      
      items.forEach(item => {
        const titleEl = item.querySelector('h1, h2, h3, .title, .headliner, [class*="title"]');
        const dateEl = item.querySelector('time, .date, [class*="date"]');
        const linkEl = item.querySelector('a');
        
        if (titleEl && dateEl) {
          const title = titleEl.textContent.trim();
          const dateText = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
          const url = linkEl ? linkEl.href : '';
          
          // Determine venue
          let venueName = 'Avant Gardner';
          const fullText = item.textContent;
          if (fullText.includes('Brooklyn Mirage')) venueName = 'Brooklyn Mirage';
          if (fullText.includes('Great Hall')) venueName = 'Avant Gardner - Great Hall';
          if (fullText.includes('Kings Hall')) venueName = 'Avant Gardner - Kings Hall';
          
          if (title && title.length > 2) {
            results.push({ title, dateText, url, venueName });
          }
        }
      });
      
      return results;
    });
    
    await browser.close();
    
    // Format events
    const formattedEvents = [];
    const seen = new Set();
    
    for (const event of events) {
      let eventDate = null;
      try {
        const parsed = new Date(event.dateText);
        if (!isNaN(parsed.getTime())) {
          eventDate = parsed.toISOString().split('T')[0];
        }
      } catch (e) {}
      
      if (eventDate && !seen.has(event.title + eventDate)) {
        seen.add(event.title + eventDate);
        
        formattedEvents.push({
          id: uuidv4(),
          title: event.title,
          date: eventDate,
          url: event.url || 'https://www.avantgardner.com',
          venue: {
            name: event.venueName,
            address: '140 Stewart Ave, Brooklyn, NY 11237',
            city: 'New York'
          },
          location: 'Brooklyn, NY',
          city: 'New York',
          description: `${event.title} at ${event.venueName}`,
          category: 'Nightlife',
          source: 'Avant Gardner'
        });
      }
    }
    
    console.log(`✅ Avant Gardner: ${formattedEvents.length} events`);
    return formattedEvents;
    
  } catch (error) {
    if (browser) await browser.close();
    console.error('Error scraping Avant Gardner:', error.message);
    return [];
  }
}

module.exports = scrape;
