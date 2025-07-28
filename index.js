require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function connectDbAndCreateTable() {
    try {
        await pool.connect();
        console.log('Connected to neon database)postgresql');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS portfolio_views (
                id SERIAL PRIMARY KEY,
                identifier VARCHAR(255) UNIQUE NOT NULL,
                count INT DEFAULT 0
            );
        `)
        console.log('Table "portfolio_views" ensured to exists');
    } catch (err) {
        console.error('Database connection or table creation error:', err);
        process.exit(1);
    }
}

connectDbAndCreateTable();

app.use(cors());
app.use(express.json());

app.get('/', (req, res)=>{
    res.send('Hello from the Portfolio Backend (PostgreSQL)!');
});

app.listen(PORT, ()=>{
    console.log(`Backend server listeningon port ${PORT}`)
})