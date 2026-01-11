import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Optimize for serverless: force generic fonts to avoid loading issues in some environments
export const maxDuration = 60; // Allow up to 60 seconds

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');

    if (!keyword) {
        return NextResponse.json({ error: 'Missing keyword parameter' }, { status: 400 });
    }

    try {
        console.log(`Analyzing topic: ${keyword}`);

        // 1. Fetch Detail Page HTML (Lightweight, no browser)
        const detailUrl = `https://m.s.weibo.com/topic/detail?q=${encodeURIComponent(keyword)}`;

        const headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        };

        const res = await fetch(detailUrl, { headers });
        if (!res.ok) throw new Error(`Weibo returned ${res.status}`);

        const html = await res.text();
        const $ = cheerio.load(html);

        // 2. Extract Static Data
        let host = '';
        const hostElement = $('#pl_topicband .host-row .host span');
        if (hostElement.length > 0) {
            host = hostElement.text().trim();
        }

        const readCount = extractCount($, '阅读');
        const discussCount = extractCount($, '讨论');
        const originalCount = extractCount($, '原创');

        // 3. Fetch Trend Data (Using the API we discovered)
        // https://m.s.weibo.com/ajax_topic/trend?q=...&time=24h
        let trendData = { level: 0, readTrend: [], discussTrend: [] };

        try {
            // Trend API requires Referer and Ajax Header to pass WAF/Bot check
            const apiHeaders = {
                ...headers,
                'Referer': detailUrl,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json, text/plain, */*'
            };

            // Trend API
            const trendRes = await fetch(`https://m.s.weibo.com/ajax_topic/trend?q=${encodeURIComponent(keyword)}&time=24h`, { headers: apiHeaders });
            const trendJson = await trendRes.json();

            // Level API
            const levelRes = await fetch(`https://m.s.weibo.com/ajax_topic/level?q=${encodeURIComponent(keyword)}`, { headers: apiHeaders });
            const levelJson = await levelRes.json();

            trendData = {
                level: levelJson?.data?.level || 0,
                readTrend: trendJson?.data?.read || [],
                discussTrend: trendJson?.data?.me || []
            };

        } catch (e) {
            console.warn('Failed to fetch trends:', e);
        }

        return NextResponse.json({
            topic: keyword,
            host,
            stats: {
                read: readCount,
                discuss: discussCount,
                original: originalCount
            },
            meta: {
                heatLevel: trendData.level
            },
            trends: {
                read: trendData.readTrend,
                discuss: trendData.discussTrend
            }
        });

    } catch (error: any) {
        console.error('Analysis failed:', error);
        return NextResponse.json({ error: 'Failed to scrape data', details: error.message }, { status: 500 });
    }
}

// Helper to extract "Number + Unit" string
function extractCount($: any, type: string) {
    const li = $('li').filter((i: number, el: any) => $(el).text().includes(type)).first();
    if (li.length > 0) {
        return li.find('span').text().trim().replace(/\s+/g, '');
    }
    return '0';
}
