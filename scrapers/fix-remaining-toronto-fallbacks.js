const fs = require('fs');
const path = require('path');

const fallbackPatterns = [
    /fallback events - only real scraped event/gi,
    /sample event/gi,
    /fallback\/sample event/gi,
    /mock.*event/gi,
    /test.*event/gi,
    /dummy.*event/gi,
    /placeholder.*event/gi,
    /fake.*event/gi,
    /example.*event/gi
];

const problemFiles = [
    'scrape-vaughan-mills-events.js',
    'scrape-velvet-events.js', 
    'scrape-vertigo-events.js',
    'scrape-xclub-events.js',
    'scrape-york-university-events.js'
];

problemFiles.forEach(filename => {
    const filePath = path.join('cities/Toronto', filename);
    
    if (!fs.existsSync(filePath)) {
        console.log(`❌ File not found: ${filename}`);
        return;
    }
    
    console.log(`🔧 Processing: ${filename}`);
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        // Remove fallback patterns
        fallbackPatterns.forEach(pattern => {
            if (pattern.test(content)) {
                console.log(`  - Removing fallback pattern in ${filename}`);
                content = content.replace(pattern, '');
                modified = true;
            }
        });
        
        // Remove lines containing fallback comments
        content = content.split('\n').filter(line => {
            const shouldRemove = line.includes('fallback') || 
                               line.includes('sample event') || 
                               line.includes('mock event') ||
                               line.includes('test event');
            if (shouldRemove) {
                console.log(`  - Removing line: ${line.trim()}`);
                modified = true;
            }
            return !shouldRemove;
        }).join('\n');
        
        if (modified) {
            fs.writeFileSync(filePath, content);
            console.log(`✅ Fixed: ${filename}`);
        } else {
            console.log(`⚪ No changes needed: ${filename}`);
        }
        
    } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error.message);
    }
});

console.log('\n✅ Batch fallback removal completed for Toronto scrapers');
