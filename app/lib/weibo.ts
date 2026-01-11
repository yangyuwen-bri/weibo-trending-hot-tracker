import { sql } from '@vercel/postgres';
import chromium from '@sparticuz/chromium';
import playwright from 'playwright-core';

// Weibo Hot Search List API
const TRENDING_LIST_URL = 'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot';

export async function fetchAndSaveHotList() {
    let browser = null;
    try {
        // 1. Launch Browser (Local vs Serverless)
        if (process.env.NODE_ENV === 'development') {
            const { chromium: localChromium } = require('playwright');
            browser = await localChromium.launch({ headless: true });
        } else {
            browser = await playwright.chromium.launch({
                args: chromium.args,
                executablePath: await chromium.executablePath(),
                headless: true,
            });
        }

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
        });
        const page = await context.newPage();

        // 2. Fetch Data from Weibo (Using Browser to bypass anti-bot)
        // Logic copied from successful test.js
        let maxRetries = 3;
        let data;

        while (maxRetries > 0) {
            try {
                await page.goto(TRENDING_LIST_URL, { waitUntil: 'domcontentloaded' });
                // Wait a bit to ensure text content is rendered (sometimes JSON is wrapped in pre)
                await page.waitForTimeout(1000);
                const content = await page.textContent('body');
                if (content) {
                    data = JSON.parse(content);
                    break;
                }
            } catch (e) {
                console.warn(`Retry fetch list... left: ${maxRetries - 1}`);
                maxRetries--;
                if (maxRetries === 0) throw e;
                await page.waitForTimeout(2000);
            }
        }

        if (!data || data.ok !== 1) {
            throw new Error('Weibo API Returned Error/Empty');
        }

        const cards = data.data?.cards?.[0]?.card_group || [];
        console.log('DEBUG: Fetched Cards Count:', cards.length);
        if (cards.length > 0) {
            console.log('DEBUG: First Card Title:', cards[0].desc);
            // DEBUG: Print all titles to see what we fetched
            console.log('DEBUG: All Titles:', cards.map((c: any) => c.desc).join(', '));
        }

        const validCards: any[] = [];
        let updateCount = 0;
        let dbError = null;

        // 3. Process & Upsert Data
        // Ensure table exists (tolerant)
        try {
            await sql`
            CREATE TABLE IF NOT EXISTS hot_searches (
                id SERIAL PRIMARY KEY,
                title TEXT UNIQUE NOT NULL,
                category TEXT,
                url TEXT,
                hot_value NUMERIC,
                first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            `;
        } catch (e: any) {
            if (!e.message.includes('missing_connection_string')) console.error('DB Init Error:', e);
        }

        for (const card of cards) {
            const title = card.desc; // Topic Name
            const hotValue = parseFloat(card.desc_extr || '0');
            const url = card.scheme;
            const category = card.category || '';

            if (!title) continue;

            validCards.push({ title, category, url, hot_value: hotValue, last_seen_at: new Date().toISOString() });

            try {
                await sql`
                    INSERT INTO hot_searches (title, category, url, hot_value, last_seen_at)
                    VALUES (${title}, ${category}, ${url}, ${hotValue}, NOW())
                    ON CONFLICT (title) 
                    DO UPDATE SET 
                        last_seen_at = NOW(),
                        hot_value = ${hotValue},
                        url = ${url};
                `;
                updateCount++;
            } catch (e: any) {
                if (!e.message.includes('missing_connection_string')) {
                    console.error('DB Upsert Error:', e);
                }
                dbError = e;
            }
        }

        return { success: true, count: updateCount, data: validCards, dbError };

    } catch (error: any) {
        console.error('fetchAndSaveHotList failed:', error);
        return { success: false, error: error.message, data: [] };
    } finally {
        if (browser) await browser.close();
    }
}
