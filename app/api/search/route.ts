import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';


export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ results: [] });
    }

    try {
        // Local DB Search Only
        const result = await sql`
        SELECT id, title, category, hot_value, last_seen_at
        FROM hot_searches
        WHERE title ILIKE ${'%' + query + '%'}
        ORDER BY last_seen_at DESC, hot_value DESC
        LIMIT 20;
    `;

        return NextResponse.json({
            results: result.rows
        });

    } catch (error: any) {
        if (error.message.includes('relation "hot_searches" does not exist')) {
            return NextResponse.json({ results: [] });
        }
        console.error('Search failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
