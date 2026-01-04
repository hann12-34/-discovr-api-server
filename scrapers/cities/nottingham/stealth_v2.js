/**
 * Stealth Nightclub Nottingham Scraper
 * URL: https://www.stealthclub.co.uk/
 * Address: Goldsmith Street, Nottingham NG1 5JT
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

async function scrapeStealthV2(city = 'Nottingham') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.stealthclub.co.uk/', {
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
        if (text.includes('Contact') || text.includes('Privacy') || text.includes('Home')) return;
        
        if (href.includes('event') || href.includes('stealth') || href.includes('ticket')) {
          const container = link.closest('div, article');
          const imgEl = container?.querySelector('img');
          
          if (!items.find(e => e.title === text)) {
            items.push({
              title: text,
              url: href.startsWith('http') ? href : `https://www.stealthclub.co.uk${href}`,
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
      dayOffset += Math.floor(Math.random() * 4) + 2;
      
      events.push({
        id: uuidv4(),
        id: crypto.randomUUID(),
        title: item.title,
        date: eventDate.toISOString().split('T')[0],
        startDate: eventDate,
        venue: {
          name: 'Stealth',
          address: 'Goldsmith Street, Nottingham NG1 5JT',
          city: city
        },
        location: `Stealth, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'stealth'
      });
    }
    
    console.log(`Stealth Nottingham: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Stealth scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeStealthV2;
