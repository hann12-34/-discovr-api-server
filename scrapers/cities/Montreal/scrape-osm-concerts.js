/**
 * Montreal Symphony Orchestra (OSM) Events Scraper - Puppeteer with REAL dates
 * URL: https://www.osm.ca/en/concerts/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape() {
  console.log('🎻 Scraping OSM concerts...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.osm.ca/en/concerts/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      
      const months = {
        'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
        'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };

      const links = document.querySelectorAll('a[href*="/en/concert/"]');
      
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || seen.has(href) || href.includes('news')) return;
        
        const container = link.closest('article, div, section') || link;
        const text = container.innerText || '';
        
        // Extract title from h2/h3 or URL
        let title = '';
        const h2 = container.querySelector('h2, h3, h4');
        if (h2) {
          title = h2.textContent.trim();
        } else {
          const match = href.match(/\/concert\/([^\/]+)/);
          if (match) {
            title = match[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          }
        }
        
        if (!title || title.length < 3) return;
        
        // Extract REAL date
        const datePatterns = [
          /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i,
          /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december),?\s*(\d{4})?/i
        ];
        
        let dateMatch = null;
        for (const pattern of datePatterns) {
          dateMatch = text.match(pattern);
          if (dateMatch) break;
        }
        
        if (!dateMatch) return; // Skip events without real dates
        
        let day, monthStr, year;
        if (/^\d/.test(dateMatch[1])) {
          day = dateMatch[1];
          monthStr = dateMatch[2].toLowerCase();
          year = dateMatch[3];
        } else {
          monthStr = dateMatch[1].toLowerCase();
          day = dateMatch[2];
          year = dateMatch[3];
        }
        
        const monthKey = monthStr.substring(0, 3);
        const monthNum = months[monthKey];
        if (monthNum === undefined) return;
        
        const eventYear = year ? parseInt(year) : (monthNum < currentMonth ? currentYear + 1 : currentYear);
        const isoDate = `${eventYear}-${String(monthNum + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
        
        const img = container.querySelector('img');
        const imageUrl = img ? (img.src || img.getAttribute('data-src')) : null;
        
        seen.add(href);
        results.push({
          title: title.substring(0, 100),
          date: isoDate,
          url: href.startsWith('http') ? href : 'https://www.osm.ca' + href,
          imageUrl: imageUrl
        });
      });
      
      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} OSM events`);

    const formattedEvents = events.map(event => {
      console.log(`  ✓ ${event.title} | ${event.date}`);
      return {
        id: uuidv4(),
        title: event.title,
        url: event.url,
        date: event.date,
        imageUrl: event.imageUrl,
        venue: {
          name: 'Maison Symphonique',
          address: '1600 Rue Saint-Urbain, Montreal, QC H2X 0S1',
          city: 'Montreal'
        },
        city: 'Montreal',
        source: 'OSM',
        categories: ['Music', 'Classical']
      };
    });

    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️ OSM error:', error.message);
    return [];
  }
}

module.exports = scrape;
module.exports.source = 'OSM';
