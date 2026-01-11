const https = require('https');
const cheerio = require('cheerio');

// Use a known hot topic for testing
const TOPIC = '林诗栋已连续11个月男单无冠';
const URL = `https://m.s.weibo.com/topic/detail?q=${encodeURIComponent(TOPIC)}`;
const TREND_URL = `https://m.s.weibo.com/ajax_topic/trend?q=${encodeURIComponent(TOPIC)}&time=24h`;

const headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Referer': URL,
    'X-Requested-With': 'XMLHttpRequest'
};

console.log(`Fetching Detail HTML: ${URL}...`);

// 1. Fetch HTML to prove baseline access
https.get(URL, { headers }, (res) => {
    console.log(`HTML Status: ${res.statusCode}`);
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log(`HTML Size: ${data.length} bytes`);
        // 2. Fetch Trend JSON
        console.log(`\nFetching Trend JSON: ${TREND_URL}...`);
        https.get(TREND_URL, { headers }, (trendRes) => {
            console.log(`Trend Status: ${trendRes.statusCode}`);
            let trendData = '';
            trendRes.on('data', c => trendData += c);
            trendRes.on('end', () => {
                try {
                    console.log('Trend Response Start:', trendData.substring(0, 100));
                    const json = JSON.parse(trendData);
                    console.log('Trend Data Keys:', Object.keys(json.data || {}));
                    if (json.data && json.data.read) {
                        console.log('Read Trend Points:', json.data.read.length);
                    } else {
                        console.log('WARNING: No read trend data found in JSON.');
                    }
                } catch (e) {
                    console.error('Failed to parse Trend JSON:', e.message);
                    console.log('Raw body:', trendData);
                }
            });
        });
    });
});
