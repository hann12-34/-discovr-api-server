/**
 * Quartier des Spectacles Events Scraper - Puppeteer with REAL date extraction
 * URL: https://www.quartierdesspectacles.com/en/calendar/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape() {
  console.log('🎪 Scraping Quartier des Spectacles...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.quartierdesspectacles.com/en/calendar/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

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

      const containers = document.querySelectorAll('article, .event, [class*="event"], [class*="card"], a[href*="/activities-and-events/"]');
      
      containers.forEach(container => {
        const text = container.innerText || '';
        const link = container.tagName === 'A' ? container : container.querySelector('a[href*="/activities-and-events/"], a[href*="/event/"]');
        const href = link ? link.getAttribute('href') : null;
        
        if (!href || seen.has(href)) return;
        if (/menu|filter|search|login|calendar$/i.test(href)) return;
        
        // Extract title
        const h2 = container.querySelector('h2, h3, h4, .title');
        let title = h2 ? h2.textContent.trim() : '';
        if (!title) {
          const lines = text.split('\n').filter(l => l.trim().length > 3);
          for (const line of lines) {
            if (line.length > 5 && line.length < 80 && !/^\d/.test(line) && !/tickets|buy|more/i.test(line)) {
              title = line.trim();
              break;
            }
          }
        }
        
        if (!title || title.length < 3) return;
        
        // Extract REAL date - English format: "December 20, 2025" or "Dec 20"
        const datePatterns = [
          /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i,
          /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i,
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
          url: href.startsWith('http') ? href : 'https://www.quartierdesspectacles.com' + href,
          imageUrl: imageUrl
        });
      });
      
      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Quartier des Spectacles events`);

    const formattedEvents = events.map(event => {
      console.log(`  ✓ ${event.title} | ${event.date}`);
      return {
        id: uuidv4(),
        title: event.title,
        url: event.url,
        date: event.date,
        imageUrl: event.imageUrl,
        venue: {
          name: 'Quartier des Spectacles',
          address: '305 Rue Sainte-Catherine Est, Montreal, QC H2X 3X7',
          city: 'Montreal'
        },
        city: 'Montreal',
        source: 'Quartier des Spectacles',
        categories: ['Arts & Entertainment', 'Festival']
      };
    });

    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️ Quartier des Spectacles error:', error.message);
    return [];
  }
}

module.exports = scrape;
module.exports.source = 'Quartier des Spectacles';
