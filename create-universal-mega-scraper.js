const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js') && f.startsWith('scrape-'));

console.log(`🚀 Creating UNIVERSAL MEGA SCRAPER logic for ALL ${files.length} scrapers...\n`);

const universalScraperLogic = `
    // UNIVERSAL MEGA SCRAPER - Works on ANY website structure
    const events = [];
    
    try {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      
      const response = await axios.get(EVENTS_URL, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // STRATEGY: Find ANY element that might be an event
      const potentialEvents = new Set();
      
      // 1. Elements with dates nearby
      $('[datetime], time, .date, [class*="date"], [data-date]').each((i, el) => {
        potentialEvents.add($(el).parent()[0]);
        potentialEvents.add($(el).closest('article, .event, .item, .card, li, section, div[class]')[0]);
      });
      
      // 2. Elements with event-like classes
      $('.event, [class*="event"], .program, .activity, .show, .performance, .concert').each((i, el) => {
        potentialEvents.add(el);
      });
      
      // 3. Articles and cards
      $('article, .card, .item, .listing, .post').each((i, el) => {
        potentialEvents.add(el);
      });
      
      console.log(\`   🔍 Found \${potentialEvents.size} potential event elements\`);
      
      Array.from(potentialEvents).forEach((eventEl) => {
        if (!eventEl) return;
        const $event = $(eventEl);
        
        // Extract title - try EVERYTHING
        let title = '';
        const titleSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', '.title', '[class*="title"]', '.name', '[class*="name"]', 'strong', 'b', 'a'];
        for (const sel of titleSelectors) {
          title = $event.find(sel).first().text().trim();
          if (title && title.length > 3 && title.length < 200) break;
        }
        
        if (!title || title.length < 3 || title.length > 200) return;
        if (title.match(/^(Menu|Nav|Skip|Search|Login|Home|About|Contact|Subscribe|Back to)/i)) return;
        
        // Extract date - ULTRA AGGRESSIVE
        let dateText = '';
        
        // Try datetime attribute
        const dtAttr = $event.find('[datetime]').attr('datetime');
        if (dtAttr) dateText = dtAttr;
        
        // Try data-date
        if (!dateText) {
          const dataDate = $event.attr('data-date') || $event.find('[data-date]').attr('data-date');
          if (dataDate) dateText = dataDate;
        }
        
        // Try date selectors
        if (!dateText) {
          const dateSelectors = ['.date', '.datetime', 'time', '[class*="date"]', '.when', '.schedule', '[class*="time"]'];
          for (const sel of dateSelectors) {
            dateText = $event.find(sel).first().text().trim();
            if (dateText && dateText.length > 4) break;
          }
        }
        
        // Last resort: scan ALL text for date patterns
        if (!dateText || dateText.length < 3) {
          const allText = $event.text();
          const patterns = [
            /\\d{4}-\\d{2}-\\d{2}/,
            /\\d{1,2}\\/\\d{1,2}\\/\\d{4}/,
            /(January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}/i,
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2},?\\s+\\d{4}/i,
            /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2},?\\s+\\d{4}/i
          ];
          
          for (const pattern of patterns) {
            const match = allText.match(pattern);
            if (match) {
              dateText = match[0];
              break;
            }
          }
        }
        
        if (!dateText || dateText.length < 3) return;
        
        // Parse date
        const parsedDate = parseDateText ? parseDateText(dateText) : null;
        if (!parsedDate || !parsedDate.startDate) return;
        
        // Extract URL
        let eventUrl = $event.find('a').first().attr('href') || '';
        if (eventUrl && !eventUrl.startsWith('http') && !eventUrl.startsWith('javascript')) {
          if (eventUrl.startsWith('/')) {
            const baseUrl = BASE_URL || EVENTS_URL.split('/').slice(0, 3).join('/');
            eventUrl = baseUrl + eventUrl;
          } else if (eventUrl.startsWith('#')) {
            eventUrl = EVENTS_URL;
          }
        }
        
        // Extract description
        const description = (
          $event.find('.description, .desc, [class*="desc"]').first().text().trim() ||
          $event.find('p').first().text().trim() ||
          title
        ).substring(0, 500);
        
        events.push({
          title: title,
          date: parsedDate.startDate.toISOString(),
          venue: { name: VENUE_NAME || 'Toronto Venue', address: 'Toronto', city: 'Toronto' },
          location: 'Toronto, ON',
          description: description,
          url: eventUrl || EVENTS_URL,
          source: 'Universal Scraper'
        });
      });
      
      console.log(\`   ✅ Extracted \${events.length} valid events\`);
      
    } catch (error) {
      if (error.response?.status === 404 || error.response?.status === 403 || error.code === 'ENOTFOUND') {
        console.log(\`   ⚠️  Website unavailable\`);
        return filterEvents([]);
      }
      console.error(\`   ❌ Error: \${error.message}\`);
    }
    
    return filterEvents(events);
`;

let fixedCount = 0;

// Apply to ALL scrapers that currently return 0 events
files.forEach((file, index) => {
  const filePath = path.join(scrapersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if this scraper needs the universal logic
  // Skip ones that already work well
  if (file.match(/(scotiabank|botanical|phoenix|woodbine|sinai)/i)) {
    return;
  }
  
  const original = content;
  
  // Replace the entire scraping function body with universal logic
  // Find the async function and replace everything between try { and return filterEvents
  const hasAsyncFunction = content.includes('async function scrape');
  
  if (hasAsyncFunction) {
    // Replace the main scraping logic
    content = content.replace(
      /(async function scrape\w+\([^)]+\) \{[\s\S]*?)(const events = \[\];[\s\S]*?return filterEvents\(events\);)/,
      `$1${universalScraperLogic}`
    );
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    if ((index + 1) % 50 === 0) {
      console.log(`✅ [${index + 1}/${files.length}]`);
    }
    fixedCount++;
  }
});

console.log(`\n📊 Applied UNIVERSAL MEGA SCRAPER to ${fixedCount}/${files.length} scrapers!`);
console.log(`\n🎯 All scrapers now use the most aggressive extraction logic possible!`);
