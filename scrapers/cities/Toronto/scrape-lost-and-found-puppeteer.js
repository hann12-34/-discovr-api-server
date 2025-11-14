/**
 * Lost & Found Scraper (Puppeteer)
 * SAFE & LEGAL: Official venue website
 * Popular bar and live music venue
 * URL: https://www.lost577.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape(city = 'Toronto') {
  console.log('🎵 Scraping Lost & Found events (Puppeteer)...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.lost577.com/events', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for events to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const events = await page.evaluate(() => {
      const eventList = [];
      
      // Look for event cards/sections
      const eventElements = document.querySelectorAll('[class*="event"], article, .card, [class*="show"]');
      
      eventElements.forEach(el => {
        // Get all text content
        const fullText = el.textContent;
        
        // Get title - prioritize heading elements
        const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
        let title = titleEl ? titleEl.textContent.trim() : '';
        
        // Get image
        const img = el.querySelector('img');
        const imageUrl = img ? (img.src || img.getAttribute('data-src') || '') : '';
        
        // If no title element, try to extract from text
        if (!title) {
          // Look for event names like "SINSATION", "Y2K", "howdy's"
          const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          title = lines.find(l => l.length > 3 && l.length < 50 && !l.includes('4AM') && !l.includes('FRIDAYS'));
        }
        
        // Get date - look for day of week + date
        let dateText = '';
        const dateMatch = fullText.match(/(NOVEMBER|DECEMBER|JANUARY|FEBRUARY|MARCH)\s+(\d{1,2})/i);
        if (dateMatch) {
          dateText = `${dateMatch[1]} ${dateMatch[2]}`;
        }
        
        // Also look for day names
        let dayOfWeek = '';
        if (fullText.match(/FRIDAY/i)) dayOfWeek = 'Friday';
        else if (fullText.match(/SATURDAY/i)) dayOfWeek = 'Saturday';
        else if (fullText.match(/MONDAY/i)) dayOfWeek = 'Monday';
        
        // Get URL
        const linkEl = el.querySelector('a');
        const url = linkEl ? linkEl.href : '';
        
        if (title && title.length > 2) {
          eventList.push({ title, dateText, dayOfWeek, url, imageUrl });
        }
      });
      
      return eventList;
    });
    
    await browser.close();
    
    console.log(`  Found ${events.length} raw events`);
    
    const processedEvents = [];
    const seenTitles = new Set();
    
    for (const event of events) {
      // Skip duplicates
      const key = event.title.toLowerCase();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);
      
      // Skip junk
      const titleLower = event.title.toLowerCase();
      if (titleLower === 'events' || titleLower === 'fridays' || titleLower === 'saturdays' ||
          titleLower === 'mondays' || titleLower.includes('upcoming') || 
          titleLower.includes('4am last call') || titleLower.length < 3) {
        continue;
      }
      
      // Parse date
      let eventDate = null;
      if (event.dateText) {
        try {
          const monthMatch = event.dateText.match(/(NOVEMBER|DECEMBER|JANUARY|FEBRUARY|MARCH)\s+(\d{1,2})/i);
          if (monthMatch) {
            const monthMap = {
              'NOVEMBER': 11, 'DECEMBER': 12, 'JANUARY': 1, 
              'FEBRUARY': 2, 'MARCH': 3
            };
            const month = monthMap[monthMatch[1].toUpperCase()];
            const day = parseInt(monthMatch[2]);
            // Nov/Dec = 2025, Jan-Mar = 2026
            const year = (month >= 11) ? 2025 : 2026;
            const dateObj = new Date(year, month - 1, day);
            eventDate = dateObj.toISOString().split('T')[0];
          }
        } catch (e) {}
      }
      
      // If no specific date but has day of week, generate upcoming dates
      if (!eventDate && event.dayOfWeek) {
        // Get next occurrence of this day
        const dayMap = { 'Friday': 5, 'Saturday': 6, 'Monday': 1 };
        const targetDay = dayMap[event.dayOfWeek];
        if (targetDay) {
          const now = new Date();
          const currentDay = now.getDay();
          let daysUntil = targetDay - currentDay;
          if (daysUntil <= 0) daysUntil += 7;
          const nextDate = new Date(now);
          nextDate.setDate(now.getDate() + daysUntil);
          eventDate = nextDate.toISOString().split('T')[0];
        }
      }
      
      processedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: eventDate,
        url: event.url || 'https://www.lost577.com/events',
        imageUrl: event.imageUrl || null,
        venue: {
          name: 'Lost & Found',
          address: '577 King St W, Toronto, ON M5V 1M1',
          city: 'Toronto'
        },
        city: city,
        category: 'Nightlife',
        source: 'Lost & Found'
      });
    }
    
    console.log(`✅ Lost & Found: ${processedEvents.length} events`);
    return filterEvents(processedEvents);
    
  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Lost & Found error:', error.message);
    return [];
  }
}

module.exports = scrape;
