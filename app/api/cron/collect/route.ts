import { NextResponse } from 'next/server';
import { fetchAndSaveHotList } from '@/app/lib/weibo';

export const dynamic = 'force-dynamic'; // Prevent caching

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('CRON_SECRET');
    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
