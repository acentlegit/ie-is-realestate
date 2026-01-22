#!/bin/bash
# Create action_history table in PostgreSQL

echo "========================================="
echo "📋 Creating Action History Table"
echo "========================================="
echo ""

# Run migration
echo "1️⃣ Running migration..."
cd /Users/bhanukiran/Downloads/ACENTLE/UiP/uip-main/services/action-engine || exit 1

node -e "
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Use explicit defaults to avoid environment variable issues
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
    
    // Verify table exists
    const result = await client.query(\`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'action_history' 
      ORDER BY ordinal_position
    \`);
    
    console.log('');
    console.log('📊 Table columns:');
    result.rows.forEach(row => {
      console.log(\`  - \${row.column_name}: \${row.data_type}\`);
    });
    
    await client.end();
    console.log('');
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
