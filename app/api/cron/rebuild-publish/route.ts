import { NextResponse } from 'next/server';
import { rebuildAllPublishTables } from '@/lib/publishTable';

export async function GET(request: Request) {
  // Verify this is coming from Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Run rebuild asynchronously (don't wait for completion)
    rebuildAllPublishTables().catch(error => {
      console.error('Error in scheduled rebuild:', error);
    });

    // Return immediately
    return NextResponse.json({ 
      success: true, 
      message: 'Rebuild started',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error starting rebuild:', error);
    return NextResponse.json(
      { error: 'Failed to start rebuild' },
      { status: 500 }
    );
  }
}

// Configure for Vercel Cron
export const runtime = 'nodejs';
