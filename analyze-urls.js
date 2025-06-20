/**
 * Script to analyze URLs and check if they are covered by existing scrapers
 * This will help identify new event sources that need scrapers
 */
const fs = require('fs');
const path = require('path');
const scraperSystem = require('./scrapers');

// Process URLs
async function analyzeUrls() {
  try {
    // Get all URLs from all registered scrapers
    const scrapersArray = scraperSystem.scrapers;
    const coveredUrls = new Set();
    const urlToScraperMap = new Map();
    
    // Collect all URLs covered by existing scrapers
    scrapersArray.forEach(scraper => {
      if (scraper.urls && Array.isArray(scraper.urls)) {
        scraper.urls.forEach(url => {
          const domain = extractDomain(url);
          coveredUrls.add(domain);
          if (!urlToScraperMap.has(domain)) {
            urlToScraperMap.set(domain, []);
          }
          urlToScraperMap.get(domain).push(scraper.name);
        });
      }
      if (scraper.url) {
        const domain = extractDomain(scraper.url);
        coveredUrls.add(domain);
        if (!urlToScraperMap.has(domain)) {
          urlToScraperMap.set(domain, []);
        }
        urlToScraperMap.get(domain).push(scraper.name);
      }
    });
    
    // Read the list of URLs to check
    const urlListPath = path.join(__dirname, 'url-list.txt');
    
    // Create a sample file with URLs (uncomment to create it)
    /*
    fs.writeFileSync(urlListPath, `
https://www.commodoreballroom.com/shows
https://www.foxcabaret.com/
https://www.fortunesoundclub.com/events
https://richmondnightmarket.com/
https://shipyardsnightmarket.com/
https://www.pne.ca/playland/
https://www.scienceworld.ca/exhibition/artemis/
https://museumofvancouver.ca/paddle-carving-2025
https://www.coastaljazz.ca/events/category/festival/
https://www.vanartgallery.bc.ca/
https://www.destinationvancouver.com/events/
    `.trim(), 'utf8');
    */
    
    // Process the list of URLs
    if (!fs.existsSync(urlListPath)) {
      console.log('URL list file not found. Creating one now...');
      fs.writeFileSync(urlListPath, '', 'utf8');
      console.log(`Created ${urlListPath}. Please add your URLs to check.`);
      return;
    }
    
    const urlsToCheck = fs.readFileSync(urlListPath, 'utf8')
      .split('\n')
      .filter(line => line.trim().startsWith('http'))
      .map(line => line.trim());
    
    console.log(`Found ${urlsToCheck.length} URLs to check`);
    
    // Analyze the URLs
    const uncoveredUrls = [];
    const coveredUrlsDetails = [];
    
    urlsToCheck.forEach(url => {
      const domain = extractDomain(url);
      if (coveredUrls.has(domain)) {
        coveredUrlsDetails.push({
          url,
          domain,
          scrapers: urlToScraperMap.get(domain)
        });
      } else {
        uncoveredUrls.push({
          url,
          domain
        });
      }
    });
    
    // Print results
    console.log('==================================================');
    console.log('COVERED URLS:');
    console.log('==================================================');
    coveredUrlsDetails.forEach(item => {
      console.log(`✅ ${item.url}`);
      console.log(`   Domain: ${item.domain}`);
      console.log(`   Covered by: ${item.scrapers.join(', ')}`);
      console.log('');
    });
    
    console.log('==================================================');
    console.log('UNCOVERED URLS:');
    console.log('==================================================');
    uncoveredUrls.forEach(item => {
      console.log(`❌ ${item.url}`);
      console.log(`   Domain: ${item.domain}`);
      console.log('');
    });
    
    console.log('==================================================');
    console.log('SUMMARY:');
    console.log('==================================================');
    console.log(`Total URLs checked: ${urlsToCheck.length}`);
    console.log(`Already covered: ${coveredUrlsDetails.length}`);
    console.log(`Not covered: ${uncoveredUrls.length}`);
    
    // Output unique domains not covered
    const uniqueUncoveredDomains = new Set(uncoveredUrls.map(item => item.domain));
    console.log(`\nUnique domains not covered: ${uniqueUncoveredDomains.size}`);
    console.log([...uniqueUncoveredDomains].sort().join('\n'));
  } catch (error) {
    console.error('Error analyzing URLs:', error);
  }
}

// Helper function to extract domain from URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    return url;
  }
}

// Run the analysis
analyzeUrls();
