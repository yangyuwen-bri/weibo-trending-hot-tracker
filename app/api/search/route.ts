import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { fetchAndSaveHotList } from '@/app/lib/weibo';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ results: [] });
    }

    try {
        // 1. First Attempt: Local DB Search
        let result = await sql`
        SELECT id, title, category, hot_value, last_seen_at
        FROM hot_searches
        WHERE title ILIKE ${'%' + query + '%'}
        ORDER BY last_seen_at DESC, hot_value DESC
        LIMIT 20;
    `;

        // 2. Fallback: If empty, fetch live list & retry
        if (result.rowCount === 0) {
            const fetchResult = await fetchAndSaveHotList();

            if (fetchResult.success) {
                // Verify if DB is working or if we should use in-memory
                if (!fetchResult.dbError) {
                    // DB worked, query it
                    result = await sql`
                    SELECT id, title, category, hot_value, last_seen_at
                    FROM hot_searches
                    WHERE title ILIKE ${'%' + query + '%'}
                    ORDER BY last_seen_at DESC, hot_value DESC
                    LIMIT 20;
                `;
                } else {
                    // DB Failed (Local Dev), Search In-Memory
                    const filtered = fetchResult.data.filter((item: any) =>
                        item.title.toLowerCase().includes(query.toLowerCase())
                    );
                    return NextResponse.json({ results: filtered });
                }
            }
        }

        return NextResponse.json({
            results: result.rows
        });

    } catch (error: any) {
        // If table doesn't exist yet OR connection missing (Local dev), try to fetch live
        if (error.message.includes('relation "hot_searches" does not exist') || error.message.includes('missing_connection_string')) {
            const fetchResult = await fetchAndSaveHotList();
            if (fetchResult.success) {
                // In-Memory Search Fallback
                const filtered = fetchResult.data.filter((item: any) =>
                    item.title.toLowerCase().includes(query.toLowerCase())
                );
                return NextResponse.json({ results: filtered });
            }
            return NextResponse.json({ results: [] });
        }
        console.error('Search failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
