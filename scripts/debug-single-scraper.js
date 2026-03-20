/**
 * DEBUG SINGLE SCRAPER: Deep Runtime Error Tracing
 * 
 * Runs a single Toronto scraper with detailed error tracing to pinpoint
 * exactly where the "Cannot read properties of undefined (reading 'startsWith')" 
 * runtime error occurs.
 */

const path = require('path');

async function debugSingleScraper() {
    console.log('\n🔍 DEBUGGING SINGLE TORONTO SCRAPER');
    console.log('=' .repeat(60));
    console.log('🎯 Goal: Trace exact location of startsWith runtime error');
    
    // Test one scraper with full error details
    const scraperFilename = 'scrape-ago-events-clean.js';
    const scraperPath = path.join('/Users/seongwoo/CascadeProjects/discovr-api-server/scrapers/cities/Toronto', scraperFilename);
    
    console.log(`\n🧪 Testing: ${scraperFilename}`);
    console.log(`📁 Path: ${scraperPath}`);
    
    try {
        console.log('\n📦 Step 1: Loading scraper module...');
        const scraperModule = require(scraperPath);
        console.log('✅ Module loaded successfully');
        console.log('📋 Export type:', typeof scraperModule.scrape);
        
        console.log('\n🚀 Step 2: Calling scraper function...');
        console.log('🎯 City parameter: "Toronto"');
        
        // Add detailed error tracking
        process.on('uncaughtException', (error) => {
            console.log('\n💥 UNCAUGHT EXCEPTION DETECTED:');
            console.log('Error message:', error.message);
            console.log('Error stack:', error.stack);
            process.exit(1);
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            console.log('\n💥 UNHANDLED REJECTION DETECTED:');
            console.log('Reason:', reason);
            console.log('Promise:', promise);
            process.exit(1);
        });
        
        const result = await scraperModule.scrape('Toronto');
        console.log(`✅ Scraper completed successfully!`);
        console.log(`📊 Result type: ${typeof result}`);
        console.log(`📈 Events found: ${Array.isArray(result) ? result.length : 'N/A'}`);
        
    } catch (error) {
        console.log('\n💥 DETAILED ERROR ANALYSIS:');
        console.log('Error name:', error.name);
        console.log('Error message:', error.message);
        console.log('\n📍 STACK TRACE:');
        console.log(error.stack);
        
        // Try to pinpoint startsWith location
        if (error.message.includes('startsWith')) {
            console.log('\n🎯 STARTSWITH ERROR DETECTED!');
            console.log('This confirms the startsWith runtime error location');
            
            // Parse stack trace for exact location
            const stackLines = error.stack.split('\n');
            const relevantLines = stackLines.filter(line => 
                line.includes('.js:') && 
                !line.includes('node_modules') &&
                !line.includes('debug-single-scraper.js')
            );
            
            console.log('\n📍 RELEVANT STACK TRACE LOCATIONS:');
            relevantLines.forEach((line, index) => {
                console.log(`   ${index + 1}. ${line.trim()}`);
            });
        }
        
        console.log('\n🔧 DEBUGGING RECOMMENDATIONS:');
        console.log('1. Check all startsWith calls in the scraper file');
        console.log('2. Verify variable assignments before startsWith usage');
        console.log('3. Add null checks before all string method calls');
        
        return { status: 'error', error: error.message, stack: error.stack };
    }
    
    return { status: 'success' };
}

// Run debugging
debugSingleScraper()
    .then((result) => {
        if (result.status === 'success') {
            console.log('\n🎉 Scraper ran successfully - no startsWith error!');
        } else {
            console.log('\n🚨 Scraper failed - startsWith error confirmed');
        }
        console.log('\n🏁 Single scraper debugging complete!');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Debug script failed:', error.message);
        process.exit(1);
    });
