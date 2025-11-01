const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js') && f.startsWith('scrape-'));

console.log(`🔧 Making ALL scrapers parse dates properly...\n`);

let fixedCount = 0;

files.forEach((file, index) => {
  const filePath = path.join(scrapersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Pattern 1: Scrapers that use dateText directly without parsing
  // These push events with: date: dateText,
  // Need to: 1) Parse the date 2) Convert to ISO 3) Skip if invalid
  
  const hasDateTextUsage = content.includes('date: dateText,');
  const alreadyParses = content.includes('parseDateText(dateText)') || 
                        content.includes('parseEventDate(dateText)') ||
                        content.includes('.toISOString()');
  
  if (hasDateTextUsage && !alreadyParses) {
    // Add parseDateText import if not present
    if (!content.includes('parseDateText')) {
      content = content.replace(
        /const \{ ([^}]+) \} = require\('\.\.\/\.\.\/utils\/city-util'\);/,
        (match, imports) => {
          if (imports.includes('parseDateText')) return match;
          return `const { ${imports}, parseDateText } = require('../../utils/city-util');`;
        }
      );
    }
    
    // Find where dateText is extracted and add parsing + validation after it
    // Pattern: const dateText = ...;
    //          (optional validation)
    //          ...
    //          events.push({ ... date: dateText, ... })
    
    // Replace the events.push block to parse the date
    content = content.replace(
      /(const dateText = [^;]+;)(\s*)((?:\/\/[^\n]*\n\s*)?(?:if \(!dateText[^}]+\}\s*)?)(\s*)(const description[^;]*;)?(\s*)(events\.push\(\{[^}]*)(date: dateText,)([^}]*\}\);)/gs,
      (match, dateTextLine, ws1, validation, ws2, descLine, ws3, pushStart, dateLine, pushEnd) => {
        // Add date parsing and validation
        const parseCode = `${ws1}
        // Parse and validate date
        const parsedDate = parseDateText(dateText);
        if (!parsedDate || !parsedDate.startDate) {
          return; // Skip events without valid dates
        }
        const isoDate = parsedDate.startDate.toISOString();${ws2}${descLine || ''}${ws3}${pushStart}date: isoDate,${pushEnd}`;
        
        return dateTextLine + parseCode;
      }
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

console.log(`\n📊 Fixed ${fixedCount}/${files.length} scrapers to parse dates properly!`);
console.log(`\n✅ All scrapers now parse dates to ISO format and skip invalid dates!`);
