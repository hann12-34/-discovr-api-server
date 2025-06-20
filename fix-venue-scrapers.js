/**
 * Script to add the 'urls' property to all venue scrapers
 * This ensures they're properly recognized by the scraper system
 */
const fs = require('fs');
const path = require('path');

const venuePath = path.join(__dirname, 'scrapers', 'venues');

// Process all venue scraper files
async function processVenueScrapers() {
  try {
    // Get list of all venue scraper files
    const files = fs.readdirSync(venuePath)
      .filter(file => file.endsWith('.js'));
    
    console.log(`Found ${files.length} venue scraper files to process`);
    
    // Process each file
    for (const file of files) {
      const filePath = path.join(venuePath, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Check if the file already has a urls property
      if (content.includes('urls:')) {
        console.log(`✓ ${file} already has 'urls' property, skipping`);
        continue;
      }
      
      // Look for the url property in the exports section
      const urlMatch = content.match(/url:\s*["'](.+?)["']/);
      
      if (!urlMatch) {
        console.log(`⚠ ${file} does not have a standard 'url' property, manual check needed`);
        continue;
      }
      
      const url = urlMatch[1];
      
      // Add urls array property after the url property
      let updatedContent = content.replace(
        /url:\s*["'](.+?)["']/,
        `url: "${url}",\n  urls: ["${url}"]`
      );
      
      // Write the updated content back to the file
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✅ Updated ${file} - added 'urls' property with value: ["${url}"]`);
    }
    
    console.log('\nAll venue scrapers have been processed!');
    
  } catch (error) {
    console.error('Error processing venue scrapers:', error);
  }
}

// Run the process
processVenueScrapers();
