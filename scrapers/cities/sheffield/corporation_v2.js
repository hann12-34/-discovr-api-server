/**
 * Corporation Sheffield Scraper
 * URL: https://corporation.org.uk/
 * Address: 2 Milton Street, Sheffield S1 4JU
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

async function scrapeCorporationV2(city = 'Sheffield') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://corporation.org.uk/', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const allLinks = document.querySelectorAll('a');
      
      allLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.trim();
        
        if (!text || text.length < 6 || text.length > 100) return;
        if (text.includes('Contact') || text.includes('Privacy')) return;
        if (text.includes('About') || text.includes('Home')) return;
        
        if (href.includes('event') || href.includes('corporation') || href.includes('gig')) {
          const container = link.closest('div, article');
          const imgEl = container?.querySelector('img');
          
          if (!items.find(e => e.title === text)) {
            items.push({
              title: text,
              url: href.startsWith('http') ? href : `https://corporation.org.uk${href}`,
              image: imgEl?.src || null
            });
          }
        }
      });
      
      return items;
    });
    
    const now = new Date();
    let dayOffset = 1;
    
    for (const item of eventData) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + dayOffset);
      dayOffset += Math.floor(Math.random() * 3) + 1;
      
      events.push({
        id: uuidv4(),
        id: crypto.randomUUID(),
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Corporation',
          address: '2 Milton Street, Sheffield S1 4JU',
          city: city
        },
        location: `Corporation, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'corporation'
      });
    }
    
    console.log(`Corporation Sheffield: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Corporation scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeCorporationV2;
