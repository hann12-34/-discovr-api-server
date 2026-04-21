/**
 * O2 Academy Newcastle Scraper
 * URL: https://www.academymusicgroup.com/o2academynewcastle/events
 * Address: Westgate Road, Newcastle upon Tyne NE1 1SW
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

async function scrapeO2AcademyNewcastleV2(city = 'Newcastle') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.academymusicgroup.com/o2academynewcastle/events', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Junk title filters
    const junkPatterns = [
      /terms\s*(and|&)\s*conditions/i,
      /privacy\s*policy/i,
      /refund.*policy/i,
      /returns?\s*policy/i,
      /cookie\s*policy/i,
      /harassment\s*policy/i,
      /ticketing\s*terms/i,
      /^live\s*events$/i,
      /accessibility/i,
      /contact\s*us/i,
      /about\s*us/i,
      /careers/i,
      /sitemap/i
    ];

    const eventData = await page.evaluate(() => {
      const items = [];
      const eventCards = document.querySelectorAll('.event-card, .event-item, [class*="event"], article');
      
      eventCards.forEach(card => {
        const linkEl = card.querySelector('a[href*="/events/"]');
        const titleEl = card.querySelector('h2, h3, h4, .event-title, .title');
        const dateEl = card.querySelector('time, .date, [datetime], [class*="date"]');
        const imgEl = card.querySelector('img');
        
        if (!linkEl || !titleEl) return;
        
        const title = titleEl.textContent?.trim();
        const href = linkEl.getAttribute('href') || '';
        const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';
        
        if (!title || title.length < 6 || title.length > 100) return;
        if (!items.find(e => e.title === title)) {
          items.push({
            title,
            url: href.startsWith('http') ? href : `https://www.academymusicgroup.com${href}`,
            image: imgEl?.src || null,
            dateStr
          });
        }
      });
      
      return items;
    });
    
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    
    for (const item of eventData) {
      // Filter junk titles
      if (junkPatterns.some(p => p.test(item.title))) continue;
      
      // Parse actual date from event
      let isoDate = null;
      if (item.dateStr) {
        if (item.dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          isoDate = item.dateStr.substring(0, 10);
        } else {
          const dateMatch = item.dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?/i);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
            const year = dateMatch[3] || now.getFullYear().toString();
            isoDate = `${year}-${month}-${day}`;
          }
        }
      }
      
      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;
      
      events.push({
        id: uuidv4(),
        title: item.title,
            description: '',
        date: isoDate,
        startDate: new Date(isoDate + 'T00:00:00.000Z'),
        venue: {
          name: 'O2 Academy Newcastle',
          address: 'Westgate Road, Newcastle upon Tyne NE1 1SW',
          city: city
        },
        location: `O2 Academy Newcastle, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'o2_academy_newcastle'
      });
    }
    
    console.log(`O2 Academy Newcastle: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('O2 Academy Newcastle scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeO2AcademyNewcastleV2;
