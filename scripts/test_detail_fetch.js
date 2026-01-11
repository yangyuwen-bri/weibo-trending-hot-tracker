const https = require('https');
const cheerio = require('cheerio');

// Use a known hot topic for testing
const TOPIC = '林诗栋已连续11个月男单无冠';
const URL = `https://m.s.weibo.com/topic/detail?q=${encodeURIComponent(TOPIC)}`;

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cookie': 'SUB=_2A25NReIPDeRhGeNI61IQ9SvKyTuIHXVuqkx1rDV6PUJbkdAKLRakkW1NSj0f-y-u-i_qX2j2vX8v8v8v8v8v8v8;' // Sometimes needed, sometimes not. Let's try without first or minimal.
    }
};

console.log(`Fetching ${URL}...`);

https.get(URL, options, (res) => {
    let data = '';
    console.log(`Status: ${res.statusCode}`);

    res.on('data', (chunk) => data += chunk);

    res.on('end', () => {
        console.log(`Size: ${data.length} bytes`);
        const $ = cheerio.load(data);

        // 1. Host
        const host = $('#pl_topicband .host-row .host span').text().trim();
        console.log(`Host: ${host}`);

        // 2. Counts
        const read = extractCount($, '阅读');
        const discuss = extractCount($, '讨论');
        const original = extractCount($, '原创');

        console.log('--- Stats ---');
        console.log(`Read: ${read}`);
        console.log(`Discuss: ${discuss}`);
        console.log(`Original: ${original}`);

        // Check if we got validity
        if (!read || read === '0') {
            console.log('WARNING: Failed to parse counts. Page might be JS rendered or blocked.');
            console.log('Snippet:', $('body').text().substring(0, 200));
        }
    });

}).on('error', (e) => console.error(e));

function extractCount($, type) {
    const li = $('li').filter((i, el) => $(el).text().includes(type)).first();
    if (li.length > 0) {
        return li.find('span').text().trim().replace(/\s+/g, '');
    }
    return '0';
}
