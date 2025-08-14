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

        await pool.query(`
            CREATE TABLE IF NOT EXISTS tab_visits (
                id SERIAL PRIMARY KEY,
                tab_name VARCHAR(255) UNIQUE NOT NULL,
                visit_count INT DEFAULT 0
            );
        `)
        console.log('Table tab visits ensured to exist');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS portfolio_visit_logs (
                id SERIAL PRIMARY KEY,
                visited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table "portfolio_visit_logs" ensured to exist.');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS project_clicks (
                id SERIAL PRIMARY KEY,
                project_name VARCHAR(255) UNIQUE NOT NULL,
                click_count INT DEFAULT 0,
                last_clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `)
        console.log('Table "project_clicks" ensured to exist.');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS project_click_logs (
                id SERIAL PRIMARY KEY,
                project_name VARCHAR(255) NOT NULL,
                clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table "projects_click_logs" ensured to exist.');
    } catch (err) {
        console.error('Database connection or table creation error:', err);
        process.exit(1);
    }
}

connectDbAndCreateTable();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello from the Portfolio Backend (PostgreSQL)!');
});

app.post('/api/views/increment', async (req, res) => {
    try {
        const identifier = 'portfolio-views';
        const result = await pool.query(`
            INSERT INTO portfolio_views (identifier, count)
            VALUES ($1, 1)
            ON CONFLICT (identifier) DO UPDATE
            SET count = portfolio_views.count + 1
            RETURNING count;
        `, [identifier]);

        const currentCount = result.rows[0].count;
        res.status(200).json({ success: true, count: currentCount });
    } catch (error) {
        console.error('Error incrementing porfolioview count:', error);
        res.status(500).json({ success: false, message: 'Server error incrementing view count' });
    }
});

app.get('/api/views', async (req, res) => {
    try {
        const identifier = 'portfolio-views';
        const result = await pool.query(`
            SELECT count FROM portfolio_views WHERE identifier = $1;    
        `, [identifier]);

        const currentCount = result.rows.length > 0 ? result.rows[0].count : 0;
        res.status(200).json({ success: true, count: currentCount });
    } catch (error) {
        console.error('Error fetching portfolio view count:', error);
        res.status(500).json({ success: false, message: 'Server error fetching view count' })
    }
});

app.post('/api/tabs/increment/:tabName', async (req, res)=>{
    const {tabName} = req.params;

    try{
        const result = await pool.query(`
            INSERT INTO tab_visits (tab_name, visit_count)
            VALUES ($1, 1)
            ON CONFLICT (tab_name) DO UPDATE
            SET visit_count = tab_visits.visit_count + 1
            RETURNING visit_count;    
        `, [tabName]);

        const currentCount = result.rows[0].visit_count;
        res.status(200).json({success: true, tabName, visitCount: currentCount});
    }catch(error){
        console.error(`Error incrementingtab visit count for ${tabName}:`, error)
        res.status(500).json({success: false, message: `Server error incrementing visit count for ${tabName}`});
    }
});

app.get('/api/tabs/visits', async (req, res)=>{
    try{
        const result = await pool.query(`
            SELECT tab_name, visit_count FROM tab_visits ORDER BY visit_count DESC;
        `);
        res.status(200).json({success: true, tabVisits: result.rows});
    }catch(error){
        console.error('Error fetching tab visit counts:', error);
        res.status(500).json({success: false, message: 'Server error fetching tab counts'});
    }
});

app.post('/api/projects/click/:projectName', async (req, res) => {
    const { projectName } = req.params;

    try {
        const resultClickCount = await pool.query(`
            INSERT INTO project_clicks (project_name, click_count, last_clicked_at)
            VALUES ($1, 1, CURRENT_TIMESTAMP)
            ON CONFLICT (project_name) DO UPDATE
            SET click_count = project_clicks.click_count + 1,
                last_clicked_at = CURRENT_TIMESTAMP
            RETURNING click_count, project_name;    
        `, [projectName]);

        await pool.query(`
            INSERT INTO project_click_logs (project_name, clicked_at)
            VALUES ($1, CURRENT_TIMESTAMP);   
        `, [projectName])

        const currentClickCount = resultClickCount.rows[0].click_count;
        res.status(200).json({ success: true, projectName: resultClickCount.rows[0].project_name, clickCount: currentClickCount });
    } catch (error) {
        console.error(`Error incrementing click count for ${projectName}:`, error);
        res.status(500).json({ success: false, message: `Server error incrementing click count for ${projectName}.` });
    }
});

app.get('/api/projects/clicks', async (req, res) => {
    try {
        const result = await pool.query(`SELECT project_name, click_count FROM project_clicks ORDER BY click_count DESC;`);
        res.status(200).json({ succes: true, projectClicks: result.rows });
    } catch (error) {
        console.error('Error fetchingproject click counts:', error);
        res.status(500).json({ success: false, message: 'Server error fetching click counts' });
    }
});

app.post('/api/views/logs', async (req, res)=>{
    try{
        await pool.query(`
            INSERT INTO portfolio_visits_logs (visited_at)
            VALUES (CURRENT_TIMESTAMP);    
        `);
        res.status(200).json({success: true, message: 'Visit logged successfully'});
    }catch(error){
        console.error('Error loggin portfolio visit:', error);
        res.status(500).json({success: false, message: 'Server error logging'})
    }
})

app.listen(PORT, () => {
    console.log(`Backend server listeningon port ${PORT}`)
})