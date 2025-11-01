const fs = require('fs');
const path = require('path');

async function auditMontrealScrapers() {
    console.log('🔍 Auditing Montreal Scrapers...\n');
    
    const scrapersDir = path.join(__dirname, 'scrapers/cities/Montreal');
    const files = fs.readdirSync(scrapersDir).filter(f => f.startsWith('scrape-') && f.endsWith('.js'));
    
    const results = {
        working: [],
        broken: [],
        errors: []
    };
    
    for (const file of files) {
        try {
            console.log(`Testing ${file}...`);
            const scraper = require(path.join(scrapersDir, file));
            
            const startTime = Date.now();
            const events = await scraper();
            const duration = Date.now() - startTime;
            
            const result = {
                file,
                eventCount: events.length,
                duration: `${duration}ms`,
                status: events.length > 0 ? 'working' : 'no-events'
            };
            
            if (events.length > 0) {
                results.working.push(result);
                console.log(`✅ ${file}: ${events.length} events (${duration}ms)`);
            } else {
                results.broken.push(result);
                console.log(`⚠️ ${file}: 0 events (${duration}ms)`);
            }
            
        } catch (error) {
            const errorResult = {
                file,
                error: error.message,
                errorType: getErrorType(error.message)
            };
            
            results.errors.push(errorResult);
            console.log(`❌ ${file}: ${error.message}`);
        }
    }
    
    // Generate summary report
    console.log('\n📊 MONTREAL SCRAPERS AUDIT SUMMARY');
    console.log('=====================================');
    console.log(`Total scrapers tested: ${files.length}`);
    console.log(`✅ Working (with events): ${results.working.length}`);
    console.log(`⚠️ No events: ${results.broken.length}`);
    console.log(`❌ Errors: ${results.errors.length}`);
    console.log(`📈 Success rate: ${((results.working.length / files.length) * 100).toFixed(1)}%\n`);
    
    // Working scrapers
    if (results.working.length > 0) {
        console.log('🎉 WORKING SCRAPERS:');
        results.working.forEach(r => {
            console.log(`  • ${r.file}: ${r.eventCount} events`);
        });
        console.log('');
    }
    
    // Categorize errors
    const errorTypes = {};
    results.errors.forEach(e => {
        if (!errorTypes[e.errorType]) errorTypes[e.errorType] = [];
        errorTypes[e.errorType].push(e.file);
    });
    
    console.log('🚨 ERROR BREAKDOWN:');
    for (const [type, files] of Object.entries(errorTypes)) {
        console.log(`  ${type}: ${files.length} scrapers`);
        files.forEach(f => console.log(`    • ${f}`));
    }
    
    // Save detailed results
    const reportPath = path.join(__dirname, 'montreal-scraper-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
            total: files.length,
            working: results.working.length,
            broken: results.broken.length,
            errors: results.errors.length,
            successRate: ((results.working.length / files.length) * 100).toFixed(1) + '%'
        },
        results
    }, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    // Generate disable suggestions
    const shouldDisable = results.errors.filter(e => 
        e.errorType.includes('DNS') || 
        e.errorType.includes('SSL') || 
        e.errorType.includes('404')
    );
    
    if (shouldDisable.length > 0) {
        console.log('\n🔧 RECOMMENDED ACTIONS:');
        console.log(`Disable ${shouldDisable.length} scrapers with broken websites:`);
        shouldDisable.forEach(s => console.log(`  • ${s.file} (${s.errorType})`));
    }
}

function getErrorType(errorMessage) {
    const msg = errorMessage.toLowerCase();
    
    if (msg.includes('enotfound') || msg.includes('dns')) return 'DNS_FAILURE';
    if (msg.includes('certificate') || msg.includes('ssl') || msg.includes('tls')) return 'SSL_ERROR';
    if (msg.includes('404') || msg.includes('not found')) return 'HTTP_404';
    if (msg.includes('500') || msg.includes('internal server')) return 'HTTP_500';
    if (msg.includes('timeout') || msg.includes('etimedout')) return 'TIMEOUT';
    if (msg.includes('connection refused') || msg.includes('econnrefused')) return 'CONNECTION_REFUSED';
    if (msg.includes('network') || msg.includes('fetch')) return 'NETWORK_ERROR';
    
    return 'OTHER_ERROR';
}

auditMontrealScrapers().catch(console.error);
