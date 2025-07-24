/**
 * Script to validate Toronto URLs, removing duplicates and checking for active status
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Function to validate a URL
function validateUrl(url) {
  // Add http:// prefix if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, { timeout: 5000 }, (res) => {
      const statusCode = res.statusCode;
      res.destroy();
      
      if (statusCode >= 200 && statusCode < 400) {
        console.log(`✅ ${url.replace(/^https?:\/\//, '')} - active (${statusCode})`);
        resolve({ url, status: 'active', statusCode });
      } else if (statusCode >= 300 && statusCode < 400) {
        console.log(`✅ ${url.replace(/^https?:\/\//, '')} - redirect (${statusCode})`);
        resolve({ url, status: 'redirect', statusCode });
      } else {
        console.log(`❌ ${url.replace(/^https?:\/\//, '')} - inactive (${statusCode})`);
        resolve({ url, status: 'inactive', statusCode });
      }
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${url.replace(/^https?:\/\//, '')} - error (${err.message})`);
      resolve({ url, status: 'error', error: err.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log(`❌ ${url.replace(/^https?:\/\//, '')} - timeout`);
      resolve({ url, status: 'timeout' });
    });
  });
}

// Function to clean raw URL text into an array of unique URLs
function cleanAndExtractUrls(rawText) {
  // Split by various possible delimiters
  const lines = rawText.split(/[\s\n\r,]+/);
  
  // Process each line to extract URLs
  const urlSet = new Set();
  
  lines.forEach(line => {
    // Clean the line and extract URL
    let url = line.trim();
    
    // Skip empty lines
    if (!url) return;
    
    // Remove any markdown formatting, brackets, etc.
    url = url.replace(/\[.*?\]/g, ''); // Remove markdown link text [text]
    url = url.replace(/\(|\)/g, '');   // Remove parentheses
    
    // Extract domain only if present
    const domainMatch = url.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (domainMatch) {
      url = domainMatch[0];
      
      // Clean up any trailing punctuation
      url = url.replace(/[.,;:!?]$/, '');
      
      // Add to set if not empty
      if (url) {
        urlSet.add(url.toLowerCase());
      }
    }
  });
  
  return [...urlSet];
}

// Main function
async function validateTorontoUrls(urlList) {
  try {
    const outputPath = path.join(__dirname, 'toronto-urls-consolidated.txt');
    const validatedPath = path.join(__dirname, 'toronto-urls-active.txt');
    const inactivePath = path.join(__dirname, 'toronto-urls-inactive.txt');
    
    // Get existing results if any
    let existingActiveUrls = new Set();
    let existingInactiveUrls = new Set();
    
    if (fs.existsSync(validatedPath)) {
      const existingActive = fs.readFileSync(validatedPath, 'utf8').split(/[\n\r]+/).filter(Boolean);
      existingActive.forEach(url => existingActiveUrls.add(url));
    }
    
    if (fs.existsSync(inactivePath)) {
      const existingInactive = fs.readFileSync(inactivePath, 'utf8').split(/[\n\r]+/).filter(Boolean);
      existingInactive.forEach(url => existingInactiveUrls.add(url));
    }
    
    // Process the current batch
    const urls = cleanAndExtractUrls(urlList);
    
    // Filter out URLs we've already validated
    const urlsToCheck = urls.filter(url => 
      !existingActiveUrls.has(url) && !existingInactiveUrls.has(url)
    );
    
    console.log(`🔍 Found ${urls.length} unique URLs in current batch`);
    console.log(`⏭️ Skipping ${urls.length - urlsToCheck.length} URLs already validated`);
    console.log(`🔍 Will validate ${urlsToCheck.length} new URLs`);
    
    // Batch URL validation to avoid overwhelming the system
    const batchSize = 5;
    const results = [];
    
    for (let i = 0; i < urlsToCheck.length; i += batchSize) {
      const batch = urlsToCheck.slice(i, i + batchSize);
      console.log(`⏳ Validating batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(urlsToCheck.length/batchSize)}`);
      
      const batchResults = await Promise.all(batch.map(url => validateUrl(url)));
      results.push(...batchResults);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Process results
    const activeUrls = results
      .filter(result => result.status === 'active' || result.status === 'redirect')
      .map(result => result.url.replace(/^https?:\/\//, ''));
    
    const inactiveUrls = results
      .filter(result => result.status !== 'active' && result.status !== 'redirect')
      .map(result => result.url.replace(/^https?:\/\//, ''));
    
    // Combine with existing results
    activeUrls.forEach(url => existingActiveUrls.add(url));
    inactiveUrls.forEach(url => existingInactiveUrls.add(url));
    
    // Sort all URLs
    const allActiveUrls = [...existingActiveUrls].sort();
    const allInactiveUrls = [...existingInactiveUrls].sort();
    
    // Write consolidated results
    let consolidatedOutput = '# ACTIVE TORONTO URLS\n\n';
    allActiveUrls.forEach(url => {
      consolidatedOutput += url + '\n';
    });
    
    consolidatedOutput += '\n\n# INACTIVE OR ERROR URLS\n\n';
    allInactiveUrls.forEach(url => {
      consolidatedOutput += url + '\n';
    });
    
    fs.writeFileSync(outputPath, consolidatedOutput);
    fs.writeFileSync(validatedPath, allActiveUrls.join('\n'));
    fs.writeFileSync(inactivePath, allInactiveUrls.join('\n'));
    
    console.log(`\n📊 Cumulative Results Summary:`);
    console.log(`✅ Active URLs: ${allActiveUrls.length}`);
    console.log(`❌ Inactive URLs: ${allInactiveUrls.length}`);
    console.log(`📝 Results written to:`);
    console.log(`   - ${outputPath} (complete report)`);
    console.log(`   - ${validatedPath} (active URLs only)`);
    console.log(`   - ${inactivePath} (inactive URLs only)`);
    
    return {
      active: allActiveUrls,
      inactive: allInactiveUrls,
      total: allActiveUrls.length + allInactiveUrls.length
    };
    
  } catch (error) {
    console.error('❌ Error validating URLs:', error);
    return { error };
  }
}

// Check if we're running from the command line
if (require.main === module) {
  // Get URLs from command line or use default test URLs
  const urlList = process.argv[2] || `
  mississaugacelebrationsquare.ca mississaugaheritage.ca
  mississaugalibrary.ca moca.ca mokshayoga.ca
  museumofillusions.ca nadege-patisserie.com
  nativeearth.ca northstandard.com nugateau.com
  `;
  
  validateTorontoUrls(urlList).catch(console.error);
}

module.exports = { validateTorontoUrls, cleanAndExtractUrls };
