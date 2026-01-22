#!/bin/bash
# Create action_history table in PostgreSQL (Simple version with hardcoded values)

cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main/services/action-engine || exit 1

node -e "
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'intent_platform',
  user: 'postgres',
  password: 'postgres'
});

(async () => {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');
    
    const sqlPath = path.join(__dirname, '../../db/postgres/migrations/003_action_history.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    console.log('✅ Action history table created successfully');
    
    await client.end();
    console.log('✅ Migration complete!');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Table already exists - skipping');
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
})();
"
