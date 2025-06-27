import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function GET() {
  try {
    const client = await pool.connect();
    
    // Get the actual table structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'conversations'
      ORDER BY ordinal_position;
    `);
    
    client.release();
    
    return NextResponse.json({
      success: true,
      table: 'conversations',
      columns: result.rows,
      column_names: result.rows.map(row => row.column_name)
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
