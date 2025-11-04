#!/usr/bin/env node

/**
 * UPDATE SELECTORS FOR EMPTY SCRAPERS
 * Add comprehensive event selectors to scrapers returning 0 events
 */

const fs = require('fs');
const path = require('path');

const COMPREHENSIVE_SELECTORS = `
      // Comprehensive event selectors
      const eventSelectors = [
        // Common event classes
        '.event', '.event-item', '.event-card', '.event-listing',
        '.show', '.show-item', '.performance', '.concert',
        
        // Date-specific
        '.calendar-event', '[class*="event"]', '[class*="show"]',
        
        // Structural
        'article', '.post', '.listing', '.card',
        
        // Links
        'a[href*="/event"]', 'a[href*="/events/"]', 'a[href*="/show"]',
        'a[href*="/calendar"]', 'a[title]',
        
        // Headers
        'h2 a', 'h3 a', 'h4 a',
        
        // Semantic
        '[itemtype*="Event"]', '[itemscope]',
        
        // Text contains
        'a:contains("Event")', 'a:contains("Show")',
        'a:contains("Concert")', 'a:contains("Performance")'
      ];

      let foundCount = 0;
      const seenUrls = new Set();

      for (const selector of eventSelectors) {
        const links = $(selector).find('a').addBack('a');
        
        if (links.length > 0 && foundCount === 0) {
          console.log(\`Found \${links.length} potential events with selector: \${selector}\`);
        }

        links.each((index, element) => {
          const $element = $(element);
          let title = $element.text().trim();
          let url = $element.attr('href');

          if (!title || !url || seenUrls.has(url)) return;
          if (title.length < 3 || title.length > 200) return;

          // Convert relative URLs
          if (url.startsWith('/')) {
            const baseUrl = response.config.url;
            const urlObj = new URL(baseUrl);
            url = urlObj.origin + url;
          }

          seenUrls.add(url);
          foundCount++;

          // Skip navigation
          const skipPatterns = [
            /\\/about/i, /\\/contact/i, /\\/home$/i, /\\/login/i,
            /facebook\\.com/i, /twitter\\.com/i, /instagram\\.com/i,
            /mailto:/i, /tel:/i, /javascript:/i, /#$/
          ];

          if (skipPatterns.some(p => p.test(url))) return;
`;

async function updateSelectors() {
  console.log('🔄 UPDATING SELECTORS FOR EMPTY SCRAPERS\n');
  
  const cityDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');
  const files = fs.readdirSync(cityDir)
    .filter(f => f.endsWith('.js') && !f.endsWith('.bak'));

  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(cityDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip if already has comprehensive selectors
    if (content.includes('Comprehensive event selectors')) {
      skipped++;
      continue;
    }

    // Look for simple event selector patterns
    const hasSimpleSelectors = /const eventSelectors = \[[^\]]{20,150}\];/.test(content);

    if (hasSimpleSelectors) {
      // Replace with comprehensive selectors
      content = content.replace(
        /const eventSelectors = \[[^\]]+\];/,
        COMPREHENSIVE_SELECTORS.split('\n').slice(1, -1).join('\n')
      );

      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated: ${file}`);
      updated++;
    }
  }

  console.log(`\n=`.repeat(35));
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
}

updateSelectors().then(() => {
  console.log('\n✅ DONE!');
  process.exit(0);
});
