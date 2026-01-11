import { sql } from '@vercel/postgres';
import { chromium } from 'playwright';
import * as dotenv from 'dotenv';
dotenv.config();

// Weibo Hot Search List API (Mobile)
const TRENDING_LIST_URL = 'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot';

async function main() {
    console.log('🚀 Starting Weibo Hot Search Collection...');
    let browser = null;
    let validCards: any[] = [];
    let updateCount = 0;

    try {
        // 1. Launch Browser
        console.log('Launching Playwright...');
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
        });
        const page = await context.newPage();

        // 2. Fetch Data
        console.log(`Navigating to ${TRENDING_LIST_URL}...`);
        let maxRetries = 3;
        let data;

        while (maxRetries > 0) {
            try {
                await page.goto(TRENDING_LIST_URL, { waitUntil: 'domcontentloaded' });
                await page.waitForTimeout(1000);
                const content = await page.textContent('body');
                if (content) {
                    try {
                        data = JSON.parse(content);
                        if (data.ok === 1) break;
                    } catch (e) { }
                    // Fallback try
                    data = JSON.parse(content);
                    if (data.ok === 1) break;
                }
            } catch (e) {
                console.warn(`Retry fetch... ${maxRetries - 1} left`);
                maxRetries--;
                if (maxRetries === 0) throw e;
                await page.waitForTimeout(2000);
            }
        }

        if (!data || data.ok !== 1) {
            throw new Error('Weibo API Returned Invalid Data');
        }

        const cards = data.data?.cards?.[0]?.card_group || [];
        console.log(`✅ Fetched ${cards.length} cards.`);

        // 3. Database Check
        try {
            // Init Table
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
            console.log('Using Table: hot_searches');
        } catch (e: any) {
            console.error('DB Init Error:', e.message);
        }

        // 4. Upsert Data
        for (const card of cards) {
            const title = card.desc;
            const hotValue = parseFloat(card.desc_extr || '0');
            const url = card.scheme;
            const category = card.category || '';

            if (!title) continue;

            validCards.push({ title });

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
                console.error(`DB Upsert Error [${title}]:`, e.message);
            }
        }

        console.log(`🎉 Successfully updated ${updateCount} topics.`);

    } catch (e: any) {
        console.error('❌ Collection Failed:', e.message);
        process.exit(1);
    } finally {
        if (browser) await browser.close();
        // Force exit to close DB pool
        process.exit(0);
    }
}

main();
