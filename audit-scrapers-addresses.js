const fs = require('fs');
const path = require('path');

function auditScrapersForAddresses() {
    console.log('🔍 AUDITING ALL SCRAPERS FOR ADDRESS EXTRACTION');
    console.log('🎯 Goal: Ensure every scraper extracts venue addresses\n');

    const citiesDir = './scrapers/cities';
    const cities = ['vancouver', 'Calgary', 'Toronto', 'Montreal'];
    
    const results = {
        total: 0,
        withAddressExtraction: 0,
        missingAddressExtraction: 0,
        scrapers: []
    };

    cities.forEach(city => {
        console.log(`\n=== ${city.toUpperCase()} SCRAPERS ===`);
        
        const cityDir = path.join(citiesDir, city);
        if (!fs.existsSync(cityDir)) {
            console.log(`❌ Directory not found: ${cityDir}`);
            return;
        }

        const files = fs.readdirSync(cityDir)
            .filter(file => file.endsWith('.js') && file.startsWith('scrape-'));

        console.log(`📁 Found ${files.length} scrapers`);

        files.forEach(file => {
            const filePath = path.join(cityDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            results.total++;
            
            const scraperAnalysis = {
                city: city,
                file: file,
                path: filePath,
                hasAddressExtraction: false,
                addressPatterns: [],
                venuePatterns: [],
                issues: []
            };

            // Check for venue address extraction patterns
            const addressPatterns = [
                /venue\.address/gi,
                /address.*venue/gi,
                /streetAddress/gi,
                /\.address/gi,
                /venue.*address/gi,
                /location.*address/gi,
                /\.street/gi,
                /\.addr/gi
            ];

            const venueExtractionPatterns = [
                /venue.*name/gi,
                /venue.*title/gi,
                /location.*name/gi,
                /venue.*:/gi,
                /location.*:/gi
            ];

            // Check if scraper extracts addresses
            addressPatterns.forEach(pattern => {
                const matches = content.match(pattern);
                if (matches) {
                    scraperAnalysis.hasAddressExtraction = true;
                    scraperAnalysis.addressPatterns.push(...matches);
                }
            });

            // Check if scraper extracts venue info
            venueExtractionPatterns.forEach(pattern => {
                const matches = content.match(pattern);
                if (matches) {
                    scraperAnalysis.venuePatterns.push(...matches);
                }
            });

            // Check for common issues
            if (!scraperAnalysis.hasAddressExtraction) {
                scraperAnalysis.issues.push('No address extraction found');
                results.missingAddressExtraction++;
            } else {
                results.withAddressExtraction++;
            }

            if (scraperAnalysis.venuePatterns.length === 0) {
                scraperAnalysis.issues.push('No venue extraction patterns found');
            }

            // Check if venue object is created properly
            const venueObjectPattern = /venue:\s*{[\s\S]*?}/g;
            const venueObjects = content.match(venueObjectPattern);
            
            if (venueObjects) {
                scraperAnalysis.venueObjects = venueObjects.map(obj => 
                    obj.substring(0, 200) + (obj.length > 200 ? '...' : '')
                );
            } else {
                scraperAnalysis.issues.push('No venue object creation found');
            }

            results.scrapers.push(scraperAnalysis);

            // Display results for this scraper
            console.log(`\n📄 ${file}:`);
            console.log(`   Address extraction: ${scraperAnalysis.hasAddressExtraction ? '✅' : '❌'}`);
            console.log(`   Venue patterns: ${scraperAnalysis.venuePatterns.length}`);
            console.log(`   Issues: ${scraperAnalysis.issues.length}`);
            
            if (scraperAnalysis.issues.length > 0) {
                scraperAnalysis.issues.forEach(issue => {
                    console.log(`   🚨 ${issue}`);
                });
            }

            if (scraperAnalysis.addressPatterns.length > 0) {
                console.log(`   ✅ Found address patterns: ${scraperAnalysis.addressPatterns.slice(0, 3).join(', ')}`);
            }
        });
    });

    // Summary
    console.log('\n📊 OVERALL SCRAPER ADDRESS AUDIT RESULTS:');
    console.log(`Total scrapers analyzed: ${results.total}`);
    console.log(`✅ Scrapers WITH address extraction: ${results.withAddressExtraction}`);
    console.log(`❌ Scrapers MISSING address extraction: ${results.missingAddressExtraction}`);
    console.log(`📈 Address extraction rate: ${((results.withAddressExtraction/results.total)*100).toFixed(1)}%`);

    // Show worst offenders
    const problemScrapers = results.scrapers.filter(s => !s.hasAddressExtraction);
    
    if (problemScrapers.length > 0) {
        console.log(`\n🚨 SCRAPERS MISSING ADDRESS EXTRACTION (${problemScrapers.length}):`);
        problemScrapers.forEach(scraper => {
            console.log(`   ${scraper.city}/${scraper.file}`);
            console.log(`      Issues: ${scraper.issues.join(', ')}`);
        });

        console.log('\n🛠️ RECOMMENDED FIXES:');
        problemScrapers.forEach(scraper => {
            console.log(`\n📝 Fix ${scraper.file}:`);
            console.log(`   1. Add venue.address extraction from source HTML/API`);
            console.log(`   2. Ensure venue object includes: { name: '', address: '' }`);
            console.log(`   3. Test address extraction with sample events`);
        });
    }

    // Show examples of good address extraction
    const goodScrapers = results.scrapers.filter(s => s.hasAddressExtraction && s.venueObjects);
    if (goodScrapers.length > 0) {
        console.log(`\n✅ EXAMPLES OF GOOD ADDRESS EXTRACTION:`);
        goodScrapers.slice(0, 3).forEach(scraper => {
            console.log(`\n📄 ${scraper.city}/${scraper.file}:`);
            console.log(`   Address patterns: ${scraper.addressPatterns.slice(0, 2).join(', ')}`);
            if (scraper.venueObjects && scraper.venueObjects.length > 0) {
                console.log(`   Venue object example: ${scraper.venueObjects[0]}`);
            }
        });
    }

    return results;
}

// Run the audit
try {
    const results = auditScrapersForAddresses();
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Fix scrapers missing address extraction');
    console.log('2. Test fixed scrapers with sample events');
    console.log('3. Re-run imports to populate addresses');
    console.log('4. Verify all events have addresses in database');
    
} catch (error) {
    console.error('❌ Error during audit:', error);
}
