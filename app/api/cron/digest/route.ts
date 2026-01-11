import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

// Initialize Resend safely to avoid build errors
const resendApiKey = process.env.RESEND_API_KEY || 're_123_mock_key'; // Fallback for build
const resend = new Resend(resendApiKey);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('CRON_SECRET');
    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Time Check: Only run at 9:00 AM Beijing Time (01:00 UTC)
    // Vercel Cron runs at UTC. 9am CST = 1am UTC.
    // Allow manual trigger via ?force=true
    const force = searchParams.get('force') === 'true';

    const now = new Date();
    const currentHourUTC = now.getUTCHours();

    // Beijing 9:00 AM is 01:00 UTC.
    // We allow a small window or check specifically for hour 1.
    if (!force && currentHourUTC !== 1) {
        return NextResponse.json({ message: 'Not 9:00 AM CST yet. Skipping.' });
    }

    try {
        // 2. Mock Data for Local Dev without DB
        if (!process.env.POSTGRES_URL) {
            return NextResponse.json({ message: 'Local Dev: DB connection missing. Skipping digest.' });
        }

        // 3. Get All Subscriptions
        const subs = await sql`SELECT * FROM subscriptions`;

        if (subs.rowCount === 0) {
            return NextResponse.json({ message: 'No subscriptions found.' });
        }

        let sentCount = 0;

        // 4. Process Each Subscription
        for (const sub of subs.rows) {
            const { email, keyword } = sub;

            // Find matching hot searches in last 24h
            const matches = await sql`
            SELECT title, hot_value, last_seen_at, url 
            FROM hot_searches 
            WHERE title ILIKE ${'%' + keyword + '%'}
            AND last_seen_at > NOW() - INTERVAL '24 hours'
            ORDER BY hot_value DESC
            LIMIT 10;
         `;

            if (matches.rowCount && matches.rowCount > 0) {
                // Send Email
                const html = `
                <h1>微博热搜日报: "${keyword}"</h1>
                <p>过去24小时不仅，监测到以下相关热搜：</p>
                <ul>
                    ${matches.rows.map(row => `
                        <li>
                            <a href="${row.url || '#'}"><strong>${row.title}</strong></a>
                            <br/>
                            <span style="color:gray; font-size:12px;">热度: ${(Number(row.hot_value) / 10000).toFixed(1)}w | 时间: ${new Date(row.last_seen_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</span>
                        </li>
                    `).join('')}
                </ul>
                <p><a href="https://weibo-analysis-app.vercel.app">查看完整分析</a></p>
             `;

                await resend.emails.send({
                    from: 'Weibo Trends <onboarding@resend.dev>', // Default Resend Sender
                    to: email,
                    subject: `【热搜日报】关于 "${keyword}" 的今日动态`,
                    html: html
                });
                sentCount++;
            }
        }

        return NextResponse.json({ success: true, sent: sentCount });

    } catch (error: any) {
        console.error('Digest Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
