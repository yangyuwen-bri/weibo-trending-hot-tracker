import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
    try {
        const { email, keyword } = await request.json();

        if (!email || !email.includes('@') || !keyword) {
            return NextResponse.json({ error: 'Invalid email or keyword' }, { status: 400 });
        }

        // 1. Ensure Table Exists
        try {
            await sql`
        CREATE TABLE IF NOT EXISTS subscriptions (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL,
            keyword TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            last_sent_at TIMESTAMP WITH TIME ZONE
        );
        `;
        } catch (e: any) {
            if (!e.message.includes('missing_connection_string')) {
                console.error('DB Init Error:', e);
            }
            // If local without DB, we can't really subscribe, return mock success or error
            // Ideally returns error in local dev without DB
        }

        // 2. Insert Subscription
        try {
            await sql`
            INSERT INTO subscriptions (email, keyword)
            VALUES (${email}, ${keyword});
        `;
        } catch (e: any) {
            if (e.message.includes('missing_connection_string')) {
                return NextResponse.json({ message: 'Local Dev Mock: Subscription simulated (No DB)' });
            }
            throw e;
        }

        return NextResponse.json({ message: 'Subscription successful' });
    } catch (error: any) {
        console.error('Subscribe Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
