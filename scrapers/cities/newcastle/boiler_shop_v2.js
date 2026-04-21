/**
 * Boiler Shop Newcastle Scraper
 * URL: https://www.boilershop.net/
 * Address: 20 South Street, Newcastle upon Tyne NE1 3PE
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

async function scrapeBoilerShopV2(city = 'Newcastle') {
  const events = [];
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.boilershop.net/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Junk title filters
    const junkPatterns = [
      /terms\s*(and|&)\s*conditions/i, /privacy\s*policy/i, /refund.*policy/i,
      /returns?\s*policy/i, /harassment\s*policy/i, /ticketing\s*terms/i,
      /^live\s*events$/i, /contact\s*us/i, /about\s*us/i
    ];

    const eventData = await page.evaluate(() => {
      const items = [];
      const eventCards = document.querySelectorAll('.event, article, [class*="event"], a[href*="event"]');
      
      eventCards.forEach(card => {
        const linkEl = card.tagName === 'A' ? card : card.querySelector('a[href]');
        const titleEl = card.querySelector('h2, h3, h4, .title') || linkEl;
        const dateEl = card.querySelector('time, .date, [datetime], [class*="date"]');
        const imgEl = card.querySelector('img');
        
        const title = titleEl?.textContent?.trim();
        const href = linkEl?.getAttribute('href') || '';
        const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '';
        
        if (!title || title.length < 6 || title.length > 100) return;
        if (!items.find(e => e.title === title)) {
          items.push({
            title,
            url: href.startsWith('http') ? href : `https://www.boilershop.net${href}`,
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
      if (junkPatterns.some(p => p.test(item.title))) continue;
      
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
          name: 'Boiler Shop',
          address: '20 South Street, Newcastle upon Tyne NE1 3PE',
          city: city
        },
        location: `Boiler Shop, ${city}`,
        city: city,
        country: 'United Kingdom',
        url: item.url,
        image: item.image,
        imageUrl: item.image,
        category: 'Nightlife',
        source: 'boiler_shop'
      });
    }
    
    console.log(`Boiler Shop Newcastle: Found ${events.length} events`);
    return events;
    
  } catch (error) {
    console.error('Boiler Shop scraper error:', error.message);
    return events;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = scrapeBoilerShopV2;
