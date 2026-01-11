import { NextResponse } from 'next/server';
import playwright from 'playwright-core';
import * as cheerio from 'cheerio';

// Optimize for serverless: force generic fonts to avoid loading issues in some environments
const FONT_URL = 'https://github.com/google/fonts/raw/main/ofl/notosanssc/NotoSansSC-Regular.ttf';

export const maxDuration = 60; // Allow up to 60 seconds for scraping (Vercel Pro/Hobby limits apply)

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');

    if (!keyword) {
        return NextResponse.json({ error: 'Missing keyword parameter' }, { status: 400 });
    }

    let browser = null;

    try {
        // 1. Launch Browser (Local vs Serverless)
        if (process.env.NODE_ENV === 'development') {
            // Local: Use full Playwright
            const { chromium: localChromium } = require('playwright');
            browser = await localChromium.launch({ headless: true });
        } else {
            // PROD: Vercel Serverless
            // Use remote executable to avoid 50MB function limit and bundling issues
            console.log('Launching Remote Chromium...');

            // @ts-ignore
            const chromium = require('@sparticuz/chromium-min');
            const remoteExecutablePath = 'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar';

            browser = await playwright.chromium.launch({
                args: chromium.args,
                executablePath: await chromium.executablePath(remoteExecutablePath),
                headless: true,
            });
        }

        // 2. Setup Context (Mobile User Agent)
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
        });
        const page = await context.newPage();

        // 3. Search logic (Reusing fetchHotSearchList logic but for specific keyword)
        // Direct navigation to detail page is possible if we know the q param
        const detailUrl = `https://m.s.weibo.com/topic/detail?q=${encodeURIComponent(keyword)}`;
        console.log(`Navigating to: ${detailUrl}`);

        await page.goto(detailUrl, { waitUntil: 'domcontentloaded' });

        // 4. Extract Static Data (Hot/Discuss/Read) - Reusing logic from fetchHotDetail
        const content = await page.content();
        const $ = cheerio.load(content);

        let host = '';
        const hostElement = $('#pl_topicband .host-row .host span');
        if (hostElement.length > 0) {
            host = hostElement.text().trim();
        }

        // Extract Counts
        const readCount = extractCount($, '阅读');
        const discussCount = extractCount($, '讨论');
        const originalCount = extractCount($, '原创');

        // 5. Fetch Trend Data (Using the API we discovered)
        const trendData = await page.evaluate(async (q: string) => {
            try {
                // Fetch Heat Level
                const levelRes = await fetch(`https://m.s.weibo.com/ajax_topic/level?q=${encodeURIComponent(q)}`);
                const levelJson = await levelRes.json();

                // Fetch 24h Trend
                const trendRes = await fetch(`https://m.s.weibo.com/ajax_topic/trend?q=${encodeURIComponent(q)}&time=24h`);
                const trendJson = await trendRes.json();

                return {
                    level: levelJson?.data?.level || 0,
                    readTrend: trendJson?.data?.read || [],
                    discussTrend: trendJson?.data?.me || []
                };
            } catch (e) {
                return { level: 0, readTrend: [], discussTrend: [] };
            }
        }, keyword);

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
        console.error('Scraping failed:', error);
        return NextResponse.json({ error: 'Failed to scrape data', details: error.message }, { status: 500 });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Helper to extract "Number + Unit" string
function extractCount($: any, type: string) {
    // Find li that contains the label text (e.g. "阅读次数")
    const li = $('li').filter((i: number, el: any) => $(el).text().includes(type)).first();
    if (li.length > 0) {
        return li.find('span').text().trim().replace(/\s+/g, '');
    }
    return '0';
}
