/**
 * Fix script for Vancouver Museum Events scraper
 * Makes the event structure consistent with validation requirements
 */
const fs = require('fs');
const path = require('path');
const scraperSystem = require('./scrapers');

async function fixMuseumScraper() {
  try {
    console.log('Running the Vancouver Museum Events scraper...');
    const events = await scraperSystem.runScraper('Vancouver Museum Events');
    
    console.log(`Scraper returned ${events.length} events`);
    console.log('\nAnalyzing event structure...');
    
    // Check if events have the expected structure
    const requiredFields = ['title', 'date', 'url'];
    const missingFields = {};
    const fieldMappings = {
      'date': ['startDate'],
      'url': ['sourceURL']
    };
    
    events.forEach((event, i) => {
      requiredFields.forEach(field => {
        if (!event[field]) {
          if (!missingFields[field]) missingFields[field] = [];
          missingFields[field].push(i);
        }
      });
    });
    
    console.log('\nFields missing from events:');
    Object.keys(missingFields).forEach(field => {
      console.log(`- ${field}: Missing in ${missingFields[field].length} events`);
      console.log(`  Should be mapped from: ${fieldMappings[field] ? fieldMappings[field].join(' or ') : 'N/A'}`);
    });
    
    // Generate the fix
    console.log('\nGenerating fix for vancouverMuseumEvents.js...');
    
    // Path to the scraper file
    const scraperPath = path.join(__dirname, 'scrapers', 'events', 'vancouverMuseumEvents.js');
    
    // Read the file content
    const content = fs.readFileSync(scraperPath, 'utf8');
    
    // Find the event creation section
    const eventCreationRegex = /const\s+event\s*=\s*{[\s\S]+?\};/g;
    const eventCreationMatches = content.match(eventCreationRegex);
    
    if (!eventCreationMatches || eventCreationMatches.length === 0) {
      console.error('Could not find event creation section in scraper file');
      return;
    }
    
    console.log('\nCurrent event structure:');
    console.log(eventCreationMatches[0]);
    
    // Create the fixed event structure
    const fixedEventStructure = `const event = {
          title: eventTitle,
          date: startDate, // Added explicit date field for validation
          url: eventHref || "https://museumofvancouver.ca", // Added explicit url field for validation
          startDate,
          endDate,
          description: fullDescription || eventDescription || \`\${eventTitle} at the Museum of Vancouver. Check the museum website for more details.\`,
          category: "Museum",
          venueType: "Museum",
          venue: {
            name: "Museum of Vancouver",
            website: "https://museumofvancouver.ca",
            address: "1100 Chestnut Street, Vancouver, BC, Canada"
          },
          imageUrl: fullImageURL || imageURL, // Changed to imageUrl for consistency
          sourceURL: eventHref,
          location: {
            city: "Vancouver",
            province: "BC", 
            country: "Canada"
          },
          type: "Exhibition",
          zipCode: "V6J 3J9",
          capacity: null,
          latitude: 49.2765,
          longitude: -123.1442,
          price: null,
          season: determineSeason(startDate),
          status: "Upcoming",
          source: "Museum of Vancouver"
        };`;
    
    // Replace the event creation section in the file
    const updatedContent = content.replace(eventCreationRegex, fixedEventStructure);
    
    // Write back to a new file to avoid breaking the original
    const fixedScraperPath = path.join(__dirname, 'scrapers', 'events', 'vancouverMuseumEvents.fixed.js');
    fs.writeFileSync(fixedScraperPath, updatedContent);
    
    console.log('\nFixed event structure:');
    console.log(fixedEventStructure);
    console.log(`\nFixed scraper saved to: ${fixedScraperPath}`);
    
    console.log('\nTo apply the fix, run:');
    console.log(`cp ${fixedScraperPath} ${scraperPath}`);
    console.log('\nThen test with:');
    console.log('node test-scraper-data.js "Vancouver Museum Events"');
    
  } catch (error) {
    console.error('Error fixing scraper:', error);
  }
}

// Run the fix
fixMuseumScraper();
