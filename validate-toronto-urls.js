/**
 * Script to validate Toronto URLs, removing duplicates and checking for active status
 */

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
    
    const req = protocol.get(url, { timeout: 10000 }, (res) => {
      const statusCode = res.statusCode;
      res.destroy();
      
      if (statusCode >= 200 && statusCode < 400) {
        resolve({ url, status: 'active', statusCode });
      } else if (statusCode >= 300 && statusCode < 400) {
        resolve({ url, status: 'redirect', statusCode });
      } else {
        resolve({ url, status: 'inactive', statusCode });
      }
    });
    
    req.on('error', (err) => {
      resolve({ url, status: 'error', error: err.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ url, status: 'timeout' });
    });
  });
}

// Function to clean raw URL text into an array of unique URLs
function cleanAndExtractUrls(rawText) {
  // Split by various possible delimiters
  const lines = rawText.split(/[\n\r]+/);
  
  // Process each line to extract URLs
  const urlSet = new Set();
  
  lines.forEach(line => {
    // Clean the line and extract URL
    let url = line.trim();
    
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
async function validateTorontoUrls() {
  try {
    // Read the input file with URLs
    const inputPath = path.join(__dirname, 'toronto-urls-input.txt');
    const outputPath = path.join(__dirname, 'toronto-urls-validated.txt');
    
    // Create input file from command line argument if provided
    if (process.argv.length > 2) {
      const rawUrls = process.argv[2];
      fs.writeFileSync(inputPath, rawUrls);
      console.log(`✅ Created input file with ${rawUrls.length} characters`);
    } else if (!fs.existsSync(inputPath)) {
      console.error('❌ No input provided. Please provide URLs as argument or create toronto-urls-input.txt');
      process.exit(1);
    }
    
    const rawText = fs.readFileSync(inputPath, 'utf8');
    const urls = cleanAndExtractUrls(rawText);
    
    console.log(`🔍 Found ${urls.length} unique URLs to validate`);
    
    // Batch URL validation to avoid overwhelming the system
    const batchSize = 10;
    const results = [];
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      console.log(`⏳ Validating batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(urls.length/batchSize)}`);
      
      const batchResults = await Promise.all(batch.map(url => validateUrl(url)));
      results.push(...batchResults);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Filter and sort results
    const activeUrls = results
      .filter(result => result.status === 'active' || result.status === 'redirect')
      .map(result => result.url.replace(/^https?:\/\//, ''))
      .sort();
    
    const inactiveUrls = results
      .filter(result => result.status !== 'active' && result.status !== 'redirect')
      .map(result => result.url.replace(/^https?:\/\//, ''));
    
    // Write results to file
    let output = '# ACTIVE TORONTO URLS\n\n';
    activeUrls.forEach(url => {
      output += url + '\n';
    });
    
    output += '\n\n# INACTIVE OR ERROR URLS\n\n';
    inactiveUrls.forEach(url => {
      output += url + '\n';
    });
    
    fs.writeFileSync(outputPath, output);
    
    console.log(`\n📊 Results Summary:`);
    console.log(`✅ Active URLs: ${activeUrls.length}`);
    console.log(`❌ Inactive URLs: ${inactiveUrls.length}`);
    console.log(`📝 Results written to: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error validating URLs:', error);
  }
}

validateTorontoUrls().catch(console.error);
