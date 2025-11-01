const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing ALL failing scrapers...\n');

const output = execSync('node ImportFiles/import-all-toronto-events.js 2>&1', {
  cwd: __dirname,
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
  timeout: 600000
});

const lines = output.split('\n');

const failures = {
  error403: [],
  error404: [],
  errorTimeout: [],
  errorDNS: [],
  errorSSL: [],
  zeroEvents: [],
  success: []
};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('❌ Error') && line.includes('403')) {
    failures.error403.push(line);
  } else if (line.includes('❌ Error') && line.includes('404')) {
    failures.error404.push(line);
  } else if (line.includes('timeout')) {
    failures.errorTimeout.push(line);
  } else if (line.includes('ENOTFOUND') || line.includes('getaddrinfo')) {
    failures.errorDNS.push(line);
  } else if (line.includes('SSL') || line.includes('certificate')) {
    failures.errorSSL.push(line);
  } else if (line.includes('✅ Scraped 0 events')) {
    failures.zeroEvents.push(line);
  } else if (line.match(/✅ Scraped [1-9]\d* events/)) {
    failures.success.push(line);
  }
}

console.log('📊 FAILURE BREAKDOWN:\n');
console.log(`✅ Success: ${failures.success.length}`);
console.log(`❌ 403 Forbidden: ${failures.error403.length}`);
console.log(`❌ 404 Not Found: ${failures.error404.length}`);
console.log(`❌ Timeout: ${failures.errorTimeout.length}`);
console.log(`❌ DNS/Domain issues: ${failures.errorDNS.length}`);
console.log(`❌ SSL errors: ${failures.errorSSL.length}`);
console.log(`⚠️  0 events found: ${failures.zeroEvents.length}`);
console.log(`\n📈 Total failures: ${failures.error403.length + failures.error404.length + failures.errorTimeout.length + failures.errorDNS.length + failures.errorSSL.length + failures.zeroEvents.length}`);

// Save detailed report
fs.writeFileSync(
  path.join(__dirname, 'failure-report.txt'),
  `FAILURE ANALYSIS\n\n` +
  `403 Forbidden (${failures.error403.length}):\n${failures.error403.join('\n')}\n\n` +
  `404 Not Found (${failures.error404.length}):\n${failures.error404.join('\n')}\n\n` +
  `Timeouts (${failures.errorTimeout.length}):\n${failures.errorTimeout.join('\n')}\n\n` +
  `DNS Issues (${failures.errorDNS.length}):\n${failures.errorDNS.join('\n')}\n\n` +
  `SSL Errors (${failures.errorSSL.length}):\n${failures.errorSSL.join('\n')}\n\n` +
  `0 Events (${failures.zeroEvents.length}):\n${failures.zeroEvents.join('\n')}\n\n` +
  `Success (${failures.success.length}):\n${failures.success.join('\n')}`
);

console.log('\n📄 Detailed report saved to failure-report.txt');
