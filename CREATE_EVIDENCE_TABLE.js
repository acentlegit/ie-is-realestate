#!/usr/bin/env node
/**
 * Create Evidence Table in PostgreSQL
 * Run this if psql command is not available
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '../../uip-main/db/postgres/migrations/002_evidence.sql');

async function createEvidenceTable() {
  const client = new Client({
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || 5432,
    database: process.env.PGDATABASE || 'intent_platform',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Read migration file
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Read migration file');

    // Execute migration
    await client.query(migrationSQL);
    console.log('✅ Evidence table created successfully');

    // Verify table exists
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'evidence'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Evidence table structure:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n✅ Evidence table is ready!');
  } catch (error) {
    if (error.code === '42P07') {
      console.log('⚠️  Evidence table already exists');
      console.log('✅ Ready to use');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Error: Cannot connect to PostgreSQL');
      console.error('   Make sure PostgreSQL is running');
      console.error('   Check connection: host, port, database, user, password');
      process.exit(1);
    } else {
      console.error('❌ Error creating evidence table:', error.message);
      console.error('\nFull error:', error);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

// Run
createEvidenceTable().catch(console.error);
