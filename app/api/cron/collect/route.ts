import { NextResponse } from 'next/server';
import { fetchAndSaveHotList } from '@/app/lib/weibo';

export const dynamic = 'force-dynamic'; // Prevent caching

export async function GET(request: Request) {
    try {
        const result = await fetchAndSaveHotList();

        if (result.success) {
            return NextResponse.json({
                success: true,
                processed: result.count,
                message: `Successfully processed ${result.count} hot searches.`
            });
        } else {
            throw result.error;
        }

    } catch (error: any) {
        console.error('Cron job failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
