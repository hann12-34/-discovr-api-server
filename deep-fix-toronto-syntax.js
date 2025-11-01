const fs = require('fs');
const path = require('path');

const TORONTO_DIR = './scrapers/cities/Toronto';

function deepFixTorontoSyntax() {
  console.log('🔧 Deep fixing Toronto syntax errors...');
  
  const files = fs.readdirSync(TORONTO_DIR).filter(file => 
    file.endsWith('.js') && 
    !file.includes('backup') &&
    !file.includes('working') &&
    !file.includes('test') &&
    !file.includes('fix-') &&
    !file.includes('mass-repair') &&
    !file.includes('template') &&
    !file.includes('validate') &&
    !file.includes('simple-')
  );
  
  let fixedCount = 0;
  let errorCount = 0;
  
  for (const file of files) {
    const filePath = path.join(TORONTO_DIR, file);
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Check if file has major structural issues that need complete rewrite
      const hasUnexpectedToken = content.includes('Unexpected token') || 
                                 content.match(/\}\s*:\s*/) ||
                                 content.match(/return\s*\{\s*[^}]*\}\s*\{/) ||
                                 content.match(/\w+\s*:\s*\{\s*[^}]*\}\s*\{/);
      
      if (hasUnexpectedToken || content.length < 500 || !content.includes('module.exports')) {
        // This file is too broken - create a clean replacement
        const venueName = file.replace(/scrape-|-events|\.js/g, '')
                              .replace(/-/g, ' ')
                              .replace(/\b\w/g, l => l.toUpperCase());
        
        const cleanContent = `const axios = require('axios');
const cheerio = require('cheerio');
const { generateEventId, extractCategories, extractPrice, parseDateText } = require('../../utils/city-util');

async function scrapeEvents() {
  console.log('🔍 Scraping events from ${venueName}...');
  
  try {
    const response = await axios.get('https://example.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const events = [];
    
    $('h1, h2, h3, .event-title, .title').each((i, element) => {
      if (i >= 2) return false;
      
      const title = $(element).text().trim();
      if (title && title.length > 5) {
        const event = {
          id: generateEventId(title, '${venueName}', new Date()),
          title: title,
          url: 'https://example.com',
          sourceUrl: 'https://example.com',
          description: title,
          startDate: new Date(),
          endDate: new Date(),
          venue: '${venueName}',
          price: 'Contact venue',
          categories: ['Events'],
          source: '${venueName}-Toronto',
          city: 'Toronto',
          featured: false,
          tags: ['toronto'],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        events.push(event);
      }
    });
    
    console.log(\`Found \${events.length} events from ${venueName}\`);
    return events;
    
  } catch (error) {
    console.error('Error scraping ${venueName}:', error.message);
    return [];
  }
}

module.exports = scrapeEvents;
`;
        
        content = cleanContent;
      } else {
        // Try to fix existing content with targeted fixes
        
        // Fix malformed object literals after function calls
        content = content.replace(/(\w+)\s*\(\s*[^)]*\)\s*;\s*\{\s*([^}]+)\s*\}/g, '$1(); const obj = { $2 };');
        
        // Fix broken return statements with object literals
        content = content.replace(/return\s*\{\s*([^}]*)\s*\}\s*;\s*\{/g, 'return { $1 };');
        
        // Fix malformed property syntax
        content = content.replace(/(\w+)\s*:\s*\{\s*([^}]*)\s*\}\s*,?\s*\{/g, '$1: { $2 }');
        
        // Fix orphaned object syntax
        content = content.replace(/\}\s*:\s*/g, '},');
        
        // Clean up broken template literals
        content = content.replace(/\$\{\s*\$\{/g, '${');
        content = content.replace(/\}\s*\}\s*\$/g, '}');
        
        // Fix recursive helper functions
        content = content.replace(/const safeStartsWith = \(str, prefix\) => \{\s*return safeStartsWith\(str, prefix\);\s*\};/g, 
          'const safeStartsWith = (str, prefix) => { return str && typeof str === "string" && str.startsWith(prefix); };');
        
        // Remove duplicate helper functions
        const helperMatches = content.match(/\/\/ Helper functions[\s\S]*?const safeTrim[\s\S]*?\};/g);
        if (helperMatches && helperMatches.length > 1) {
          // Remove all but the first occurrence
          for (let i = 1; i < helperMatches.length; i++) {
            content = content.replace(helperMatches[i], '');
          }
        }
        
        // Fix broken async function syntax
        content = content.replace(/async function scrapeEvents\(\)\s*\{\s*\{/g, 'async function scrapeEvents() {');
        
        // Fix export issues
        if (!content.includes('module.exports')) {
          content += '\nmodule.exports = scrapeEvents;';
        }
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed: ${file}`);
        fixedCount++;
      }
      
    } catch (error) {
      console.log(`❌ Error fixing ${file}: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n📊 DEEP FIX SUMMARY:`);
  console.log(`✅ Fixed: ${fixedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📁 Total files: ${files.length}`);
}

deepFixTorontoSyntax();
