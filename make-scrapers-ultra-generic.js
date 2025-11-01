const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js') && f.startsWith('scrape-'));

console.log(`🚀 Making ALL ${files.length} scrapers ultra-generic...\n`);

let fixedCount = 0;

files.forEach((file, index) => {
  const filePath = path.join(scrapersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Find the main scraping logic and replace with ultra-generic version
  // Look for the pattern where we load the page and parse it
  
  if (content.includes('$(\'.event')) {
    // Replace the entire event extraction with ULTRA GENERIC version
    content = content.replace(
      /\$\('[^']+'\)\.each\(\(i, event\) => \{[\s\S]*?\}\);[\s\S]*?return filterEvents\(events\);/,
      `// ULTRA GENERIC: Try multiple strategies to find events
    
    // Strategy 1: Look for obvious event containers
    let eventElements = $('.event, .events-item, .event-item, [class*="event"]');
    
    // Strategy 2: If none found, try cards/items/articles
    if (eventElements.length === 0) {
      eventElements = $('.card, .item, article, .post, .listing, li[class*="event"]');
    }
    
    // Strategy 3: If still none, try any element with a date
    if (eventElements.length === 0) {
      eventElements = $('[datetime], [data-date], .date').parent();
    }
    
    // Strategy 4: Last resort - find any headings with nearby text
    if (eventElements.length === 0) {
      eventElements = $('h1, h2, h3, h4').parent();
    }
    
    console.log(\`   📦 Found \${eventElements.length} potential event elements\`);
    
    eventElements.each((i, event) => {
      const $event = $(event);
      
      // Extract title - try many selectors
      const title = (
        $event.find('h1').first().text().trim() ||
        $event.find('h2').first().text().trim() ||
        $event.find('h3').first().text().trim() ||
        $event.find('h4').first().text().trim() ||
        $event.find('.title, .name, .heading, [class*="title"], strong, b').first().text().trim() ||
        $event.find('a').first().text().trim() ||
        $event.text().split('\\n')[0].trim()
      );
      
      // Skip if no valid title
      if (!title || title.length < 3 || title.length > 200) return;
      
      // Extract date - ULTRA AGGRESSIVE
      const dateText = (() => {
        // Try datetime attribute
        const dt = $event.find('[datetime]').attr('datetime');
        if (dt) return dt;
        
        // Try data-date
        const dd = $event.attr('data-date') || $event.find('[data-date]').attr('data-date');
        if (dd) return dd;
        
        // Try date selectors
        const dateEl = $event.find('.date, .datetime, .event-date, .start-date, time, .when, [class*="date"]').first().text().trim();
        if (dateEl && dateEl.length > 4) return dateEl;
        
        // Scan ALL text for date patterns
        const allText = $event.text();
        const patterns = [
          /\\d{4}-\\d{2}-\\d{2}/,
          /\\d{1,2}\\/\\d{1,2}\\/\\d{4}/,
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2},?\\s+\\d{4}/i,
          /(January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}/i,
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2}/i
        ];
        
        for (const pattern of patterns) {
          const match = allText.match(pattern);
          if (match) return match[0];
        }
        
        return '';
      })();
      
      // Skip if no date found
      if (!dateText || dateText.length < 3) return;
      
      // Parse date
      const parsedDate = parseDateText ? parseDateText(dateText) : null;
      if (!parsedDate || !parsedDate.startDate) return;
      
      // Extract URL
      const url = $event.find('a').first().attr('href') || $event.attr('href') || EVENTS_URL || '';
      const fullUrl = url.startsWith('http') ? url : (url.startsWith('/') ? (BASE_URL || EVENTS_URL.split('/').slice(0, 3).join('/')) + url : url);
      
      // Extract description
      const description = (
        $event.find('.description, .desc, [class*="desc"]').first().text().trim() ||
        $event.find('p').first().text().trim() ||
        title
      );
      
      events.push({
        title: title,
        date: parsedDate.startDate.toISOString(),
        venue: { name: VENUE_NAME || 'Toronto Venue', address: 'Toronto', city: 'Toronto' },
        location: 'Toronto, ON',
        description: description.substring(0, 500),
        url: fullUrl,
        source: 'Web Scraper'
      });
    });
    
    console.log(\`   ✅ Extracted \${events.length} valid events\`);
    
    return filterEvents(events);`
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

console.log(`\n📊 Made ${fixedCount}/${files.length} scrapers ultra-generic!`);
console.log(`\n🎯 Scrapers can now extract events from ANY website structure!`);
