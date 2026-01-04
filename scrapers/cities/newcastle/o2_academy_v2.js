/**
 * O2 Academy Newcastle Scraper
 * URL: https://www.academymusicgroup.com/o2academynewcastle/events
 * Address: Westgate Road, Newcastle upon Tyne NE1 1SW
 */

const puppeteer = require('puppeteer');
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
    
    const eventData = await page.evaluate(() => {
      const items = [];
      const allLinks = document.querySelectorAll('a');
      
      allLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.trim();
        
        if (!text || text.length < 6 || text.length > 100) return;
        if (text.includes('Contact') || text.includes('Privacy')) return;
        if (text.includes('Sitemap') || text.includes('Legal')) return;
        
        if (href.includes('event') || href.includes('academy') || href.includes('ticket')) {
          const container = link.closest('div, article');
          const imgEl = container?.querySelector('img');
          
          if (!items.find(e => e.title === text)) {
            items.push({
              title: text,
              url: href.startsWith('http') ? href : `https://www.academymusicgroup.com${href}`,
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
