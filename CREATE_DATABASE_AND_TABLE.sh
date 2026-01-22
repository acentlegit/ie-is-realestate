#!/bin/bash
# Create intent_platform database and evidence table

echo "========================================="
echo "📋 Creating Database & Evidence Table"
echo "========================================="
echo ""

# Connection details (Docker PostgreSQL default)
PGHOST=${PGHOST:-localhost}
PGPORT=${PGPORT:-5432}
PGDATABASE=${PGDATABASE:-postgres}
PGUSER=${PGUSER:-postgres}
PGPASSWORD=${PGPASSWORD:-postgres}

echo "Connection: $PGUSER@$PGHOST:$PGPORT/$PGDATABASE"
echo ""

# Create database first (if it doesn't exist)
echo "1️⃣ Creating 'intent_platform' database..."
cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main/services/evidence-engine || exit 1

node -e "
const { Client } = require('pg');
const client = new Client({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'postgres',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres'
});

(async () => {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');
    
    // Create database if it doesn't exist
    const dbResult = await client.query(\`
      SELECT 1 FROM pg_database WHERE datname = 'intent_platform'
    \`);
    
    if (dbResult.rows.length === 0) {
      await client.query('CREATE DATABASE intent_platform');
      console.log('✅ Database intent_platform created');
    } else {
      console.log('✅ Database intent_platform already exists');
    }
    
    await client.end();
    
    // Now connect to intent_platform and create table
    const client2 = new Client({
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT || 5432,
      database: 'intent_platform',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres'
    });
    
    await client2.connect();
    console.log('✅ Connected to intent_platform database');
    
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, '../../../db/postgres/migrations/002_evidence.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client2.query(migrationSQL);
    console.log('✅ Evidence table created');
    
    // Verify
    const result = await client2.query(\`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'evidence'
      ORDER BY ordinal_position
    \`);
    
    console.log(\`✅ Table verified (\${result.rows.length} columns)\`);
    await client2.end();
    
    process.exit(0);
  } catch (error) {
    if (error.code === '42P07') {
      console.log('✅ Evidence table already exists');
      process.exit(0);
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
})();
" PGHOST="$PGHOST" PGPORT="$PGPORT" PGDATABASE="$PGDATABASE" PGUSER="$PGUSER" PGPASSWORD="$PGPASSWORD"

echo ""
echo "========================================="
echo "✅ Done!"
echo "========================================="
