import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { connectionString, password } = await req.json();

    let targetUrl = connectionString;
    if (!targetUrl && password) {
      targetUrl = `postgresql://neondb_owner:${encodeURIComponent(password)}@ep-bold-silence-b3bw8hxt-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`;
    }

    if (!targetUrl) {
      return NextResponse.json({ success: false, message: 'Please provide either password or connection string' }, { status: 400 });
    }

    // Test connection
    const testPool = new Pool({
      connectionString: targetUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 7000,
    });

    const start = Date.now();
    const res = await testPool.query('SELECT NOW() as now, current_database() as db, current_user as usr;');
    const latencyMs = Date.now() - start;
    await testPool.end();

    // If successful, update .env.local file
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      const content = `# Neon Postgres Database Connection\nDATABASE_URL="${targetUrl}"\nNEXT_PUBLIC_APP_NAME="Cadence • Attendance Intelligence"\n`;
      fs.writeFileSync(envPath, content, 'utf8');
      process.env.DATABASE_URL = targetUrl;
    } catch (fsErr) {
      console.warn('Could not write .env.local:', fsErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Neon PostgreSQL!',
      database: res.rows[0]?.db,
      user: res.rows[0]?.usr,
      latencyMs,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message || 'Connection failed. Verify password and project availability.',
      },
      { status: 400 }
    );
  }
}

