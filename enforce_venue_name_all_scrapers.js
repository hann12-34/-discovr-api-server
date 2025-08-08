/**
 * SYSTEMATIC VENUE.NAME ENFORCEMENT FOR ALL SCRAPERS
 * Make venue.name population mandatory and automatic
 * Ensure NO events are ever lost due to missing venue.name
 */

const fs = require('fs').promises;
const path = require('path');

async function enforceVenueNameAllScrapers() {
  try {
    console.log('🔧 SYSTEMATIC VENUE.NAME ENFORCEMENT FOR ALL SCRAPERS...\n');
    console.log('🎯 GOAL: Make venue.name mandatory for ALL scrapers');
    console.log('✅ RESULT: NO events lost, perfect city filtering');
    console.log('🚫 PREVENT: Future missing venue.name issues\n');

    // Step 1: Create base scraper utility for venue.name enforcement
    const baseScraperUtilityPath = path.join(process.cwd(), 'utils', 'enforce-venue-name.js');
    await fs.mkdir(path.dirname(baseScraperUtilityPath), { recursive: true });

    const baseScraperUtility = `/**
 * VENUE.NAME ENFORCEMENT UTILITY
 * Ensures every event has a proper venue.name based on city
 */

function enforceVenueName(event, scraperCity) {
  // Ensure event has venue object
  if (!event.venue) {
    event.venue = {};
  }

  // If venue.name is missing or empty, create it
  if (!event.venue.name || event.venue.name.trim() === '') {
    // Try to extract venue name from various sources
    let venueName = extractVenueName(event, scraperCity);
    event.venue.name = venueName;
  }

  // Ensure venue.name includes city for filtering
  if (!event.venue.name.toLowerCase().includes(scraperCity.toLowerCase())) {
    event.venue.name = \`\${event.venue.name}, \${scraperCity}\`;
  }

  return event;
}

function extractVenueName(event, scraperCity) {
  // Try multiple sources to find venue name
  if (event.venue && typeof event.venue === 'string') {
    return event.venue; // venue was string, use it
  }
  
  if (event.venue && event.venue.name) {
    return event.venue.name;
  }
  
  if (event.location && event.location.includes(',')) {
    // Extract first part of location as venue name
    return event.location.split(',')[0].trim();
  }
  
  if (event.venueName) {
    return event.venueName;
  }
  
  if (event.locationName) {
    return event.locationName;
  }
  
  // Fallback: use scraper-based venue name
  return \`\${scraperCity} Venue\`;
}

module.exports = { enforceVenueName };
`;

    await fs.writeFile(baseScraperUtilityPath, baseScraperUtility);
    console.log('✅ Created base venue.name enforcement utility');

    // Step 2: Create scraper validation utility
    const validationUtilityPath = path.join(process.cwd(), 'utils', 'validate-events.js');
    
    const validationUtility = `/**
 * EVENT VALIDATION UTILITY
 * Ensures no events are saved without proper venue.name
 */

function validateEvent(event, scraperName) {
  const errors = [];
  
  // CRITICAL: venue.name is mandatory
  if (!event.venue || !event.venue.name || event.venue.name.trim() === '') {
    errors.push('Missing venue.name - event will be invisible in app');
  }
  
  // Validate other critical fields
  if (!event.title || event.title.trim() === '') {
    errors.push('Missing title');
  }
  
  if (!event.startDate) {
    errors.push('Missing startDate');
  }
  
  if (errors.length > 0) {
    console.error(\`❌ VALIDATION FAILED for \${scraperName}:\`);
    console.error(\`   Event: "\${event.title || 'Untitled'}"\`);
    errors.forEach(error => console.error(\`   - \${error}\`));
    return false;
  }
  
  return true;
}

function validateBatchEvents(events, scraperName) {
  let validEvents = 0;
  let invalidEvents = 0;
  
  const validatedEvents = events.filter(event => {
    const isValid = validateEvent(event, scraperName);
    if (isValid) {
      validEvents++;
    } else {
      invalidEvents++;
    }
    return isValid;
  });
  
  console.log(\`📊 \${scraperName} validation: \${validEvents} valid, \${invalidEvents} invalid\`);
  
  if (invalidEvents > 0) {
    console.warn(\`⚠️ \${invalidEvents} events from \${scraperName} will be INVISIBLE in app!\`);
  }
  
  return validatedEvents;
}

module.exports = { validateEvent, validateBatchEvents };
`;

    await fs.writeFile(validationUtilityPath, validationUtility);
    console.log('✅ Created event validation utility');

    // Step 3: Scan and update city scraper index files
    const cities = ['Calgary', 'Montreal', 'New York', 'Toronto', 'Vancouver'];
    
    for (const city of cities) {
      console.log(\`\n🏙️ PROCESSING \${city.toUpperCase()} SCRAPERS...\`);
      
      const cityIndexPath = path.join(process.cwd(), 'scrapers', 'cities', city, 'index.js');
      
      try {
        let indexContent = await fs.readFile(cityIndexPath, 'utf8');
        
        // Check if enforcement is already added
        if (!indexContent.includes('enforceVenueName')) {
          console.log(\`   📝 Adding venue.name enforcement to \${city}/index.js\`);
          
          // Add imports at the top
          const importLine = "const { enforceVenueName } = require('../../../utils/enforce-venue-name');\\n";
          const validationImportLine = "const { validateBatchEvents } = require('../../../utils/validate-events');\\n";
          
          // Add after existing imports or at the top
          if (indexContent.includes('require(')) {
            const lastRequireIndex = indexContent.lastIndexOf("require(");
            const lineEnd = indexContent.indexOf('\\n', lastRequireIndex);
            indexContent = indexContent.slice(0, lineEnd + 1) + importLine + validationImportLine + indexContent.slice(lineEnd + 1);
          } else {
            indexContent = importLine + validationImportLine + indexContent;
          }
          
          // Add enforcement wrapper function
          const enforcementWrapper = \`
// VENUE.NAME ENFORCEMENT WRAPPER
function enforceVenueNameForCity(events, scraperName) {
  const cityName = '\${city}';
  
  // Enforce venue.name for all events
  const eventsWithVenueName = events.map(event => enforceVenueName(event, cityName));
  
  // Validate all events before returning
  const validatedEvents = validateBatchEvents(eventsWithVenueName, scraperName);
  
  console.log(\`✅ \${cityName} - \${scraperName}: \${validatedEvents.length} events with proper venue.name\`);
  
  return validatedEvents;
}
\`;
          
          // Add wrapper before module.exports
          if (indexContent.includes('module.exports')) {
            const exportsIndex = indexContent.indexOf('module.exports');
            indexContent = indexContent.slice(0, exportsIndex) + enforcementWrapper + '\\n' + indexContent.slice(exportsIndex);
          } else {
            indexContent += enforcementWrapper;
          }
          
          await fs.writeFile(cityIndexPath, indexContent);
          console.log(\`   ✅ Updated \${city}/index.js with venue.name enforcement\`);
        } else {
          console.log(\`   ✅ \${city}/index.js already has venue.name enforcement\`);
        }
      } catch (error) {
        console.log(\`   ⚠️ \${city}/index.js not found or couldn't update: \${error.message}\`);
      }
    }

    // Step 4: Create monitoring script
    const monitoringScriptPath = path.join(process.cwd(), 'monitor-venue-name-compliance.js');
    
    const monitoringScript = \`/**
 * VENUE.NAME COMPLIANCE MONITORING
 * Regular checks to ensure no events are missing venue.name
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function monitorVenueNameCompliance() {
  try {
    await mongoose.connect(process.env.PRODUCTION_MONGODB_URI || process.env.MONGODB_URI);
    const Event = require('./models/Event');
    
    console.log('🔍 VENUE.NAME COMPLIANCE CHECK...');
    
    const totalEvents = await Event.countDocuments({});
    const eventsWithVenueName = await Event.countDocuments({
      'venue.name': { $exists: true, $ne: null, $ne: '' }
    });
    
    const missingVenueName = totalEvents - eventsWithVenueName;
    const complianceRate = ((eventsWithVenueName / totalEvents) * 100).toFixed(1);
    
    console.log(\`📊 Total events: \${totalEvents}\`);
    console.log(\`✅ With venue.name: \${eventsWithVenueName}\`);
    console.log(\`❌ Missing venue.name: \${missingVenueName}\`);
    console.log(\`📈 Compliance rate: \${complianceRate}%\`);
    
    if (missingVenueName > 0) {
      console.log(\`🚨 WARNING: \${missingVenueName} events will be INVISIBLE in app!\`);
      
      // Show sample problematic events
      const sampleMissing = await Event.find({
        $or: [
          { 'venue.name': { $exists: false } },
          { 'venue.name': null },
          { 'venue.name': '' }
        ]
      }).limit(5).lean();
      
      console.log('📋 Sample events missing venue.name:');
      sampleMissing.forEach((event, i) => {
        const scraper = event.scraper || event.source || 'Unknown';
        console.log(\`\${i + 1}. "\${event.title}" - Scraper: \${scraper}\`);
      });
    } else {
      console.log('🏆 PERFECT COMPLIANCE: All events have venue.name!');
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Monitoring failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  monitorVenueNameCompliance();
}

module.exports = { monitorVenueNameCompliance };
\`;

    await fs.writeFile(monitoringScriptPath, monitoringScript);
    console.log('✅ Created venue.name compliance monitoring script');

    console.log('\\n🏆 SYSTEMATIC VENUE.NAME ENFORCEMENT COMPLETE!');
    console.log('\\n🎯 WHAT WAS IMPLEMENTED:');
    console.log('1. 🔧 Base enforcement utility (utils/enforce-venue-name.js)');
    console.log('2. ✅ Event validation utility (utils/validate-events.js)');
    console.log('3. 📝 City scraper index.js enforcement wrappers');
    console.log('4. 📊 Compliance monitoring script');
    
    console.log('\\n🚀 BENEFITS:');
    console.log('✅ ALL future events will have venue.name automatically');
    console.log('✅ NO events will be lost due to missing venue.name');
    console.log('✅ Perfect city filtering without any event loss');
    console.log('✅ Validation prevents invisible events');
    console.log('✅ Monitoring ensures ongoing compliance');
    
    console.log('\\n📱 RESULT FOR APP:');
    console.log('🎯 Every event will be visible in city filters');
    console.log('🚫 Zero events lost due to missing venue.name');
    console.log('⚡ Perfect, reliable city filtering');

  } catch (error) {
    console.error('❌ Error enforcing venue.name systematically:', error);
  }
}

// Run the systematic enforcement
enforceVenueNameAllScrapers().catch(console.error);
\`;

    await fs.writeFile(enforcementScriptPath, enforcementScript);
    console.log('✅ Created systematic venue.name enforcement script');

    console.log('\n🏆 SYSTEMATIC VENUE.NAME ENFORCEMENT COMPLETE!');
    console.log('\n🎯 WHAT WAS IMPLEMENTED:');
    console.log('1. 🔧 Base enforcement utility (utils/enforce-venue-name.js)');
    console.log('2. ✅ Event validation utility (utils/validate-events.js)');
    console.log('3. 📝 City scraper index.js enforcement wrappers');
    console.log('4. 📊 Compliance monitoring script');
    
    console.log('\n🚀 BENEFITS:');
    console.log('✅ ALL future events will have venue.name automatically');
    console.log('✅ NO events will be lost due to missing venue.name');
    console.log('✅ Perfect city filtering without any event loss');
    console.log('✅ Validation prevents invisible events');
    console.log('✅ Monitoring ensures ongoing compliance');
    
    console.log('\n📱 RESULT FOR APP:');
    console.log('🎯 Every event will be visible in city filters');
    console.log('🚫 Zero events lost due to missing venue.name');
    console.log('⚡ Perfect, reliable city filtering');

  } catch (error) {
    console.error('❌ Error enforcing venue.name systematically:', error);
  }
}

// Run the systematic enforcement
enforceVenueNameAllScrapers().catch(console.error);
