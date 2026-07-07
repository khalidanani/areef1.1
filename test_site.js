const https = require('https');

function checkUrl(url) {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`\n--- Response from ${url} ---`);
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers: ${JSON.stringify(res.headers)}`);
      console.log(`Body starts with: ${data.substring(0, 200)}...`);
      if (data.includes('error-log')) {
         console.log('✅ Error log script found!');
      } else {
         console.log('❌ Error log script NOT found!');
      }
    });
  }).on('error', err => {
    console.error(`Error fetching ${url}:`, err.message);
  });
}

checkUrl('https://areef.org/');
checkUrl('https://ahusamsh.github.io/areef/');
