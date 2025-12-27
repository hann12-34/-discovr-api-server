/**
 * Espace St-Denis Full Scraper - Puppeteer with REAL date extraction
 * URL: https://espacestdenis.com/programmation/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrape() {
  console.log('🎭 Scraping Espace St-Denis...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://espacestdenis.com/programmation/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Scroll to load all events
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
        'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
        'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11,
        'jan': 0, 'fév': 1, 'mar': 2, 'avr': 3, 'mai': 4, 'jun': 5,
        'jul': 6, 'aoû': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'déc': 11
      };

      // Find event links directly
      const links = document.querySelectorAll('a[href*="/evenement/"]');
      
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || seen.has(href)) return;
        
        // Get the parent container for context
        const container = link.closest('article, div, section') || link;
        const text = container.innerText || '';
        
        // Extract title from URL slug (most reliable)
        const slugMatch = href.match(/\/evenement\/([^\/]+)/);
        if (!slugMatch) return;
        
        let title = slugMatch[1]
          .replace(/-/g, ' ')
          .replace(/\d{4,}$/, '') // Remove trailing numbers
          .trim();
        
        // Capitalize properly
        title = title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        // Skip category-only titles
        if (/^(musique|humour|variété|théâtre|famille|cirque|conférence)$/i.test(title)) {
          // Try to get better title from link text or nearby h2
          const h2 = container.querySelector('h2, h3');
          if (h2) {
            const h2Text = h2.textContent.trim();
            if (h2Text.length > 5 && h2Text.length < 100) {
              title = h2Text;
            }
          }
        }
        
        if (!title || title.length < 3) return;
        
        // Extract REAL date from text
        // Pattern: "20 décembre 2025" or "20 déc" or "20 décembre"
        const datePatterns = [
          /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/i,
          /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/i,
          /(\d{1,2})\s+(jan|fév|mar|avr|mai|jun|jul|aoû|sep|oct|nov|déc)\.?\s*(\d{4})?/i
        ];
        
        let dateMatch = null;
        for (const pattern of datePatterns) {
          dateMatch = text.match(pattern);
          if (dateMatch) break;
        }
        
        if (!dateMatch) return; // Skip events without real dates
        
        const day = dateMatch[1].padStart(2, '0');
        const monthStr = dateMatch[2].toLowerCase();
        let monthKey = monthStr;
        if (monthStr.length > 3) {
          monthKey = monthStr;
        } else {
          monthKey = monthStr.substring(0, 3);
        }
        
        const monthNum = months[monthKey];
        if (monthNum === undefined) return;
        
        const year = dateMatch[3] ? parseInt(dateMatch[3]) : (monthNum < currentMonth ? currentYear + 1 : currentYear);
        const isoDate = `${year}-${String(monthNum + 1).padStart(2, '0')}-${day}`;
        
        // Get image
        const img = container.querySelector('img');
        const imageUrl = img ? (img.src || img.getAttribute('data-src')) : null;
        
        seen.add(href);
        results.push({
          title: title.substring(0, 100),
          date: isoDate,
          url: href.startsWith('http') ? href : 'https://espacestdenis.com' + href,
          imageUrl: imageUrl
        });
      });
      
      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Espace St-Denis events`);

    const formattedEvents = events.map(event => {
      console.log(`  ✓ ${event.title} | ${event.date}`);
      return {
        id: uuidv4(),
        title: event.title,
        url: event.url,
        date: event.date,
        imageUrl: event.imageUrl,
        venue: {
          name: 'Espace St-Denis',
          address: '1594 Rue Saint-Denis, Montreal, QC H2X 3K3',
          city: 'Montreal'
        },
        city: 'Montreal',
        source: 'Espace St-Denis',
        categories: ['Arts & Entertainment', 'Theatre']
      };
    });

    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️ Espace St-Denis error:', error.message);
    return [];
  }
}

module.exports = scrape;
module.exports.source = 'Espace St-Denis';
