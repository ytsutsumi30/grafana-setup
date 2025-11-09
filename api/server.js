const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const { Pool } = require('pg');
const Joi = require('joi');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
require('dotenv').config();

const execPromise = util.promisify(exec);

// OCRルートのインポート
const ocrRoutes = require('./routes/ocr');

// ログ設定
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// データベース接続設定
const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'production_db',
    user: process.env.DB_USER || 'production_user',
    password: process.env.DB_PASSWORD || 'production_pass',
    // SSL設定: 環境変数で制御（ローカルPostgreSQLではSSL無効）
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false // RDS自己署名証明書対応
    } : false
});

// Express アプリケーション設定
const app = express();
const PORT = process.env.PORT || 3001;

// プロキシ信頼設定（nginxリバースプロキシ対応）
app.set('trust proxy', 1);

// ミドルウェア設定
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// レート制限（プロキシ対応）
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 100, // リクエスト数制限
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // プロキシ環境での正確なIP取得
    trustProxy: true,
    keyGenerator: (req) => {
        // X-Forwarded-Forから実際のクライアントIPを取得
        return req.ip || req.connection.remoteAddress;
    }
});
app.use(limiter);

// リクエストログ
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`, { 
        ip: req.ip, 
        userAgent: req.get('User-Agent') 
    });
    next();
});

// ヘルスチェック
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// === OCR API（AWS Textract） ===
app.use('/ocr', ocrRoutes);

// データベース接続テスト
app.get('/db-test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ 
            status: 'Database connected', 
            time: result.rows[0].now 
        });
    } catch (error) {
        logger.error('Database connection error:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// === 製品関連API ===

// バリデーションスキーマ
const productSchema = Joi.object({
    product_code: Joi.string().max(50).required(),
    product_name: Joi.string().max(255).required(),
    description: Joi.string().allow('', null),
    unit_price: Joi.number().min(0).allow(null),
    category: Joi.string().max(100).allow('', null)
});

// 製品一覧取得
app.get('/products', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, i.current_stock, i.available_stock 
            FROM products p 
            LEFT JOIN inventory i ON p.id = i.product_id 
            ORDER BY p.product_code
        `);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 製品詳細取得
app.get('/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT p.*, i.current_stock, i.available_stock, i.location 
            FROM products p 
            LEFT JOIN inventory i ON p.id = i.product_id 
            WHERE p.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error fetching product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 製品登録
app.post('/products', async (req, res) => {
    try {
        const { error, value } = productSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { product_code, product_name, description, unit_price, category } = value;

        // 製品コードの重複チェック
        const existingProduct = await pool.query(
            'SELECT id FROM products WHERE product_code = $1',
            [product_code]
        );

        if (existingProduct.rows.length > 0) {
            return res.status(409).json({ error: '製品コードが既に存在します' });
        }

        // トランザクション開始
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 製品を登録
            const productResult = await client.query(`
                INSERT INTO products (product_code, product_name, description, unit_price, category)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [product_code, product_name, description, unit_price, category]);

            const newProduct = productResult.rows[0];

            // 在庫レコードを初期化
            await client.query(`
                INSERT INTO inventory (product_id, current_stock, reserved_stock)
                VALUES ($1, 0, 0)
            `, [newProduct.id]);

            await client.query('COMMIT');

            logger.info('Product created:', newProduct);
            res.status(201).json(newProduct);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Error creating product:', error);
        if (error.code === '23505') { // Unique violation
            res.status(409).json({ error: '製品コードが既に存在します' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// 製品更新
app.put('/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error, value } = productSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { product_code, product_name, description, unit_price, category } = value;

        // 製品コードの重複チェック（自分以外）
        const existingProduct = await pool.query(
            'SELECT id FROM products WHERE product_code = $1 AND id != $2',
            [product_code, id]
        );

        if (existingProduct.rows.length > 0) {
            return res.status(409).json({ error: '製品コードが既に存在します' });
        }

        const result = await pool.query(`
            UPDATE products 
            SET product_code = $1,
                product_name = $2,
                description = $3,
                unit_price = $4,
                category = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `, [product_code, product_name, description, unit_price, category, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        logger.info('Product updated:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error updating product:', error);
        if (error.code === '23505') { // Unique violation
            res.status(409).json({ error: '製品コードが既に存在します' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// 製品削除
app.delete('/products/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 削除前にリレーションチェック
        const relatedRecords = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM production_plans WHERE product_id = $1) as production_plans,
                (SELECT COUNT(*) FROM production_records WHERE product_id = $1) as production_records,
                (SELECT COUNT(*) FROM shipping_instructions WHERE product_id = $1) as shipping_instructions,
                (SELECT COUNT(*) FROM product_components WHERE product_id = $1) as product_components
        `, [id]);

        const relations = relatedRecords.rows[0];
        const hasRelations = Object.values(relations).some(count => parseInt(count) > 0);

        if (hasRelations) {
            return res.status(409).json({ 
                error: '関連データが存在するため削除できません',
                relations: relations
            });
        }

        // トランザクション開始
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 在庫レコードを削除
            await client.query('DELETE FROM inventory WHERE product_id = $1', [id]);

            // 製品を削除
            const result = await client.query(
                'DELETE FROM products WHERE id = $1 RETURNING *',
                [id]
            );

            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Product not found' });
            }

            await client.query('COMMIT');

            logger.info('Product deleted:', result.rows[0]);
            res.json({ message: 'Product deleted successfully', data: result.rows[0] });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// === 生産計画API ===

// 生産計画一覧取得
app.get('/production-plans', async (req, res) => {
    try {
        const { status } = req.query;

        let query = `
            SELECT pp.*, p.product_code, p.product_name
            FROM production_plans pp
            JOIN products p ON pp.product_id = p.id
        `;
        const params = [];

        if (status) {
            query += ' WHERE pp.status = $1';
            params.push(status);
        }

        query += ' ORDER BY pp.planned_start_date DESC, pp.created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching production plans:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 生産計画詳細取得
app.get('/production-plans/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT pp.*, p.product_code, p.product_name
            FROM production_plans pp
            JOIN products p ON pp.product_id = p.id
            WHERE pp.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Production plan not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error fetching production plan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 生産計画登録
app.post('/production-plans', async (req, res) => {
    try {
        const {
            plan_id,
            product_id,
            planned_quantity,
            planned_start_date,
            planned_end_date,
            status
        } = req.body;

        // バリデーション
        if (!plan_id || !product_id || !planned_quantity) {
            return res.status(400).json({
                error: 'Plan ID, product ID, and planned quantity are required'
            });
        }

        if (planned_quantity <= 0) {
            return res.status(400).json({
                error: 'Planned quantity must be greater than 0'
            });
        }

        // 日付の妥当性チェック
        if (planned_start_date && planned_end_date) {
            const startDate = new Date(planned_start_date);
            const endDate = new Date(planned_end_date);
            if (endDate < startDate) {
                return res.status(400).json({
                    error: 'End date must be after start date'
                });
            }
        }

        const result = await pool.query(`
            INSERT INTO production_plans
            (plan_id, product_id, planned_quantity, planned_start_date, planned_end_date, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            plan_id,
            product_id,
            planned_quantity,
            planned_start_date || null,
            planned_end_date || null,
            status || 'planned'
        ]);

        logger.info('Production plan created:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        logger.error('Error creating production plan:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Plan ID already exists' });
        }
        if (error.code === '23503') { // Foreign key violation
            return res.status(400).json({ error: 'Invalid product ID' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 生産計画更新
app.put('/production-plans/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            plan_id,
            product_id,
            planned_quantity,
            planned_start_date,
            planned_end_date,
            status
        } = req.body;

        // バリデーション
        if (!plan_id || !product_id || !planned_quantity) {
            return res.status(400).json({
                error: 'Plan ID, product ID, and planned quantity are required'
            });
        }

        if (planned_quantity <= 0) {
            return res.status(400).json({
                error: 'Planned quantity must be greater than 0'
            });
        }

        // 日付の妥当性チェック
        if (planned_start_date && planned_end_date) {
            const startDate = new Date(planned_start_date);
            const endDate = new Date(planned_end_date);
            if (endDate < startDate) {
                return res.status(400).json({
                    error: 'End date must be after start date'
                });
            }
        }

        const result = await pool.query(`
            UPDATE production_plans
            SET plan_id = $1, product_id = $2, planned_quantity = $3,
                planned_start_date = $4, planned_end_date = $5, status = $6,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *
        `, [
            plan_id,
            product_id,
            planned_quantity,
            planned_start_date || null,
            planned_end_date || null,
            status || 'planned',
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Production plan not found' });
        }

        logger.info('Production plan updated:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error updating production plan:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Plan ID already exists' });
        }
        if (error.code === '23503') { // Foreign key violation
            return res.status(400).json({ error: 'Invalid product ID' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 生産計画削除
app.delete('/production-plans/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 関連する生産実績の確認
        const relatedRecords = await pool.query(`
            SELECT COUNT(*) as count
            FROM production_records
            WHERE plan_id = $1
        `, [id]);

        const recordCount = parseInt(relatedRecords.rows[0].count);

        if (recordCount > 0) {
            return res.status(409).json({
                error: '関連する生産実績が存在するため削除できません',
                production_records: recordCount
            });
        }

        const result = await pool.query(
            'DELETE FROM production_plans WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Production plan not found' });
        }

        logger.info('Production plan deleted:', result.rows[0]);
        res.json({ message: 'Production plan deleted successfully' });
    } catch (error) {
        logger.error('Error deleting production plan:', error);
        if (error.code === '23503') { // Foreign key violation
            return res.status(409).json({ error: 'Cannot delete: production plan is referenced by other records' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// === 出荷場所・納入場所API ===
app.get('/shipping-locations', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM shipping_locations 
            ORDER BY location_code
        `);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching shipping locations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 出荷場所詳細取得
app.get('/shipping-locations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM shipping_locations WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shipping location not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error fetching shipping location:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 出荷場所登録
app.post('/shipping-locations', async (req, res) => {
    try {
        const { location_code, location_name, address, phone, contact_person } = req.body;

        // バリデーション
        if (!location_code || !location_name) {
            return res.status(400).json({ error: 'Location code and name are required' });
        }

        const result = await pool.query(
            `INSERT INTO shipping_locations
             (location_code, location_name, address, phone, contact_person)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [location_code, location_name, address || null, phone || null, contact_person || null]
        );

        logger.info('Shipping location created:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        logger.error('Error creating shipping location:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Location code already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 出荷場所更新
app.put('/shipping-locations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { location_code, location_name, address, phone, contact_person } = req.body;

        // バリデーション
        if (!location_code || !location_name) {
            return res.status(400).json({ error: 'Location code and name are required' });
        }

        const result = await pool.query(
            `UPDATE shipping_locations
             SET location_code = $1, location_name = $2, address = $3,
                 phone = $4, contact_person = $5
             WHERE id = $6
             RETURNING *`,
            [location_code, location_name, address || null, phone || null, contact_person || null, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shipping location not found' });
        }

        logger.info('Shipping location updated:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error updating shipping location:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Location code already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 出荷場所削除
app.delete('/shipping-locations/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM shipping_locations WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shipping location not found' });
        }

        logger.info('Shipping location deleted:', result.rows[0]);
        res.json({ message: 'Shipping location deleted successfully' });
    } catch (error) {
        logger.error('Error deleting shipping location:', error);
        if (error.code === '23503') { // Foreign key violation
            return res.status(409).json({ error: 'Cannot delete: location is referenced by shipping instructions' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/delivery-locations', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM delivery_locations
            ORDER BY location_code
        `);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching delivery locations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 納入場所詳細取得
app.get('/delivery-locations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM delivery_locations WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Delivery location not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error fetching delivery location:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 納入場所登録
app.post('/delivery-locations', async (req, res) => {
    try {
        const { location_code, location_name, address, phone, contact_person, delivery_method } = req.body;

        // バリデーション
        if (!location_code || !location_name) {
            return res.status(400).json({ error: 'Location code and name are required' });
        }

        const result = await pool.query(
            `INSERT INTO delivery_locations
             (location_code, location_name, address, phone, contact_person, delivery_method)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [location_code, location_name, address || null, phone || null, contact_person || null, delivery_method || '宅配便']
        );

        logger.info('Delivery location created:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        logger.error('Error creating delivery location:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Location code already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 納入場所更新
app.put('/delivery-locations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { location_code, location_name, address, phone, contact_person, delivery_method } = req.body;

        // バリデーション
        if (!location_code || !location_name) {
            return res.status(400).json({ error: 'Location code and name are required' });
        }

        const result = await pool.query(
            `UPDATE delivery_locations
             SET location_code = $1, location_name = $2, address = $3,
                 phone = $4, contact_person = $5, delivery_method = $6
             WHERE id = $7
             RETURNING *`,
            [location_code, location_name, address || null, phone || null, contact_person || null, delivery_method || '宅配便', id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Delivery location not found' });
        }

        logger.info('Delivery location updated:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error updating delivery location:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Location code already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 納入場所削除
app.delete('/delivery-locations/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM delivery_locations WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Delivery location not found' });
        }

        logger.info('Delivery location deleted:', result.rows[0]);
        res.json({ message: 'Delivery location deleted successfully' });
    } catch (error) {
        logger.error('Error deleting delivery location:', error);
        if (error.code === '23503') { // Foreign key violation
            return res.status(409).json({ error: 'Cannot delete: location is referenced by shipping instructions' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// === 出荷指示関連API ===
app.get('/shipping-instructions', async (req, res) => {
    try {
        const { 
            status, 
            priority, 
            shipping_location, 
            delivery_location, 
            shipping_date_from,
            shipping_date_to,
            instruction_id 
        } = req.query;
        
        let query = `
            SELECT si.*, p.product_code, p.product_name,
                   sl.location_name as shipping_location_name,
                   sl.location_code as shipping_location_code,
                   dl.location_name as delivery_location_name,
                   dl.location_code as delivery_location_code,
                   dl.address as delivery_address,
                   dl.phone as delivery_phone
            FROM shipping_instructions si
            JOIN products p ON si.product_id = p.id
            LEFT JOIN shipping_locations sl ON si.shipping_location_id = sl.id
            LEFT JOIN delivery_locations dl ON si.delivery_location_id = dl.id
        `;
        const params = [];
        const conditions = [];

        if (status) {
            conditions.push('si.status = $' + (params.length + 1));
            params.push(status);
        }
        
        if (priority) {
            conditions.push('si.priority = $' + (params.length + 1));
            params.push(priority);
        }

        if (shipping_location) {
            conditions.push('sl.location_code = $' + (params.length + 1));
            params.push(shipping_location);
        }

        if (delivery_location) {
            conditions.push('dl.location_code = $' + (params.length + 1));
            params.push(delivery_location);
        }

        if (instruction_id) {
            conditions.push('si.instruction_id ILIKE $' + (params.length + 1));
            params.push(`%${instruction_id}%`);
        }

        if (shipping_date_from) {
            conditions.push('si.shipping_date >= $' + (params.length + 1));
            params.push(shipping_date_from);
        }

        if (shipping_date_to) {
            conditions.push('si.shipping_date <= $' + (params.length + 1));
            params.push(shipping_date_to);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY si.created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching shipping instructions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/shipping-instructions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT si.*, p.product_code, p.product_name,
                   sl.location_name as shipping_location_name,
                   sl.location_code as shipping_location_code,
                   sl.address as shipping_address,
                   dl.location_name as delivery_location_name,
                   dl.location_code as delivery_location_code,
                   dl.address as delivery_address,
                   dl.phone as delivery_phone,
                   dl.contact_person as delivery_contact
            FROM shipping_instructions si
            JOIN products p ON si.product_id = p.id
            LEFT JOIN shipping_locations sl ON si.shipping_location_id = sl.id
            LEFT JOIN delivery_locations dl ON si.delivery_location_id = dl.id
            WHERE si.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shipping instruction not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error fetching shipping instruction:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 出荷指示登録
app.post('/shipping-instructions', async (req, res) => {
    try {
        const {
            instruction_id,
            product_id,
            quantity,
            shipping_date,
            shipping_location_id,
            delivery_location_id,
            customer_name,
            priority,
            status,
            tracking_number,
            notes
        } = req.body;

        // バリデーション
        if (!instruction_id || !product_id || !quantity) {
            return res.status(400).json({
                error: 'Instruction ID, product ID, and quantity are required'
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                error: 'Quantity must be greater than 0'
            });
        }

        const result = await pool.query(`
            INSERT INTO shipping_instructions
            (instruction_id, product_id, quantity, shipping_date,
             shipping_location_id, delivery_location_id, customer_name,
             priority, status, tracking_number, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            instruction_id,
            product_id,
            quantity,
            shipping_date || null,
            shipping_location_id || null,
            delivery_location_id || null,
            customer_name || null,
            priority || 'normal',
            status || 'pending',
            tracking_number || null,
            notes || null
        ]);

        logger.info('Shipping instruction created:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        logger.error('Error creating shipping instruction:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Instruction ID already exists' });
        }
        if (error.code === '23503') { // Foreign key violation
            return res.status(400).json({ error: 'Invalid product, shipping location, or delivery location ID' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 出荷指示更新
app.put('/shipping-instructions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            instruction_id,
            product_id,
            quantity,
            shipping_date,
            shipping_location_id,
            delivery_location_id,
            customer_name,
            priority,
            status,
            tracking_number,
            notes
        } = req.body;

        // バリデーション
        if (!instruction_id || !product_id || !quantity) {
            return res.status(400).json({
                error: 'Instruction ID, product ID, and quantity are required'
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                error: 'Quantity must be greater than 0'
            });
        }

        const result = await pool.query(`
            UPDATE shipping_instructions
            SET instruction_id = $1, product_id = $2, quantity = $3,
                shipping_date = $4, shipping_location_id = $5,
                delivery_location_id = $6, customer_name = $7,
                priority = $8, status = $9, tracking_number = $10,
                notes = $11, updated_at = CURRENT_TIMESTAMP
            WHERE id = $12
            RETURNING *
        `, [
            instruction_id,
            product_id,
            quantity,
            shipping_date || null,
            shipping_location_id || null,
            delivery_location_id || null,
            customer_name || null,
            priority || 'normal',
            status || 'pending',
            tracking_number || null,
            notes || null,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shipping instruction not found' });
        }

        logger.info('Shipping instruction updated:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error updating shipping instruction:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Instruction ID already exists' });
        }
        if (error.code === '23503') { // Foreign key violation
            return res.status(400).json({ error: 'Invalid product, shipping location, or delivery location ID' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 出荷指示削除
app.delete('/shipping-instructions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 関連する検品データの確認
        const relatedRecords = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM shipping_inspections WHERE shipping_instruction_id = $1) as shipping_inspections,
                (SELECT COUNT(*) FROM qr_inspections WHERE shipping_instruction_id = $1) as qr_inspections
        `, [id]);

        const relations = relatedRecords.rows[0];
        const hasRelations = Object.values(relations).some(count => parseInt(count) > 0);

        if (hasRelations) {
            return res.status(409).json({
                error: '関連する検品データが存在するため削除できません',
                relations: relations
            });
        }

        const result = await pool.query(
            'DELETE FROM shipping_instructions WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shipping instruction not found' });
        }

        logger.info('Shipping instruction deleted:', result.rows[0]);
        res.json({ message: 'Shipping instruction deleted successfully' });
    } catch (error) {
        logger.error('Error deleting shipping instruction:', error);
        if (error.code === '23503') { // Foreign key violation
            return res.status(409).json({ error: 'Cannot delete: shipping instruction is referenced by other records' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 納入場所別サマリー取得
app.get('/shipping-instructions/summary/by-delivery-location', async (req, res) => {
    try {
        const { 
            shipping_location, 
            delivery_location, 
            shipping_date_from,
            shipping_date_to,
            instruction_id 
        } = req.query;

        let query = `
            SELECT 
                dl.location_code,
                dl.location_name,
                dl.address,
                dl.phone,
                dl.contact_person,
                dl.delivery_method,
                COUNT(si.id) as total_items,
                SUM(si.quantity) as total_quantity,
                SUM(CASE WHEN si.status = 'delivered' THEN 1 ELSE 0 END) as completed_items,
                SUM(CASE WHEN si.status = 'pending' THEN 1 ELSE 0 END) as pending_items,
                SUM(CASE WHEN si.status = 'processing' THEN 1 ELSE 0 END) as processing_items,
                SUM(CASE WHEN si.status = 'shipped' THEN 1 ELSE 0 END) as shipped_items,
                MIN(si.shipping_date) as earliest_shipping_date,
                MAX(si.shipping_date) as latest_shipping_date
            FROM delivery_locations dl
            LEFT JOIN shipping_instructions si ON dl.id = si.delivery_location_id
            LEFT JOIN shipping_locations sl ON si.shipping_location_id = sl.id
        `;
        const params = [];
        const conditions = [];

        if (shipping_location) {
            conditions.push('sl.location_code = $' + (params.length + 1));
            params.push(shipping_location);
        }

        if (delivery_location) {
            conditions.push('dl.location_code = $' + (params.length + 1));
            params.push(delivery_location);
        }

        if (instruction_id) {
            conditions.push('si.instruction_id ILIKE $' + (params.length + 1));
            params.push(`%${instruction_id}%`);
        }

        if (shipping_date_from) {
            conditions.push('si.shipping_date >= $' + (params.length + 1));
            params.push(shipping_date_from);
        }

        if (shipping_date_to) {
            conditions.push('si.shipping_date <= $' + (params.length + 1));
            params.push(shipping_date_to);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += `
            GROUP BY dl.id, dl.location_code, dl.location_name, dl.address, dl.phone, dl.contact_person, dl.delivery_method
            HAVING COUNT(si.id) > 0
            ORDER BY dl.location_name
        `;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching delivery location summary:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 納入場所詳細（品目リスト）取得
app.get('/shipping-instructions/detail/:deliveryLocationCode', async (req, res) => {
    try {
        const { deliveryLocationCode } = req.params;
        const { 
            shipping_location, 
            shipping_date_from,
            shipping_date_to,
            instruction_id 
        } = req.query;

        let query = `
            SELECT si.*, p.product_code, p.product_name,
                   sl.location_name as shipping_location_name,
                   sl.location_code as shipping_location_code,
                   dl.location_name as delivery_location_name,
                   dl.location_code as delivery_location_code,
                   dl.address as delivery_address,
                   dl.phone as delivery_phone,
                   dl.contact_person as delivery_contact
            FROM shipping_instructions si
            JOIN products p ON si.product_id = p.id
            LEFT JOIN shipping_locations sl ON si.shipping_location_id = sl.id
            JOIN delivery_locations dl ON si.delivery_location_id = dl.id
            WHERE dl.location_code = $1
        `;
        const params = [deliveryLocationCode];
        const conditions = [];

        if (shipping_location) {
            conditions.push('sl.location_code = $' + (params.length + 1));
            params.push(shipping_location);
        }

        if (instruction_id) {
            conditions.push('si.instruction_id ILIKE $' + (params.length + 1));
            params.push(`%${instruction_id}%`);
        }

        if (shipping_date_from) {
            conditions.push('si.shipping_date >= $' + (params.length + 1));
            params.push(shipping_date_from);
        }

        if (shipping_date_to) {
            conditions.push('si.shipping_date <= $' + (params.length + 1));
            params.push(shipping_date_to);
        }

        if (conditions.length > 0) {
            query += ' AND ' + conditions.join(' AND ');
        }

        query += ' ORDER BY si.shipping_date ASC, si.created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching delivery location detail:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 単一出荷指示の詳細取得
app.get('/shipping-instructions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT si.*, p.product_code, p.product_name,
                   sl.location_name as shipping_location_name,
                   sl.location_code as shipping_location_code,
                   dl.location_name as delivery_location_name,
                   dl.location_code as delivery_location_code,
                   dl.address as delivery_address,
                   dl.phone as delivery_phone,
                   dl.contact_person as delivery_contact,
                   dl.delivery_method
            FROM shipping_instructions si
            JOIN products p ON si.product_id = p.id
            LEFT JOIN shipping_locations sl ON si.shipping_location_id = sl.id
            JOIN delivery_locations dl ON si.delivery_location_id = dl.id
            WHERE si.id = $1
        `;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shipping instruction not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error fetching shipping instruction detail:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ピッキング情報の更新
app.patch('/shipping-instructions/:id/picking', async (req, res) => {
    try {
        const { id } = req.params;
        const { picked_quantity, notes } = req.body;
        
        // バリデーション
        if (picked_quantity !== undefined && (picked_quantity < 0 || !Number.isInteger(picked_quantity))) {
            return res.status(400).json({ error: 'Invalid picked_quantity' });
        }
        
        const query = `
            UPDATE shipping_instructions 
            SET picked_quantity = $1,
                picking_notes = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `;
        
        const result = await pool.query(query, [picked_quantity, notes, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shipping instruction not found' });
        }
        
        res.json({ message: 'Picking information updated successfully', data: result.rows[0] });
    } catch (error) {
        logger.error('Error updating picking information:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// === 出荷検品関連API ===
app.get('/shipping-inspections', async (req, res) => {
    try {
        const { shipping_instruction_id } = req.query;
        let query = `
            SELECT shi.*, si.instruction_id, p.product_code, p.product_name
            FROM shipping_inspections shi
            JOIN shipping_instructions si ON shi.shipping_instruction_id = si.id
            JOIN products p ON si.product_id = p.id
        `;
        const params = [];

        if (shipping_instruction_id) {
            query += ' WHERE shi.shipping_instruction_id = $1';
            params.push(shipping_instruction_id);
        }

        query += ' ORDER BY shi.inspection_date DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching shipping inspections:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// === 製品構成部品API ===

// 製品構成部品一覧取得（全件）
app.get('/product-components', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT pc.*, p.product_code, p.product_name
            FROM product_components pc
            JOIN products p ON pc.product_id = p.id
            ORDER BY p.product_code,
                CASE pc.component_type
                    WHEN 'main' THEN 1
                    WHEN 'accessory' THEN 2
                    WHEN 'manual' THEN 3
                    WHEN 'warranty' THEN 4
                    ELSE 5
                END, pc.component_name
        `);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching product components:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 製品構成部品詳細取得
app.get('/product-components/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT pc.*, p.product_code, p.product_name
            FROM product_components pc
            JOIN products p ON pc.product_id = p.id
            WHERE pc.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product component not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error fetching product component:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 製品構成部品登録
app.post('/product-components', async (req, res) => {
    try {
        const { product_id, component_type, component_name, qr_code, is_required } = req.body;

        // バリデーション
        if (!product_id || !component_type || !component_name || !qr_code) {
            return res.status(400).json({
                error: 'Product ID, component type, name, and QR code are required'
            });
        }

        const result = await pool.query(`
            INSERT INTO product_components
            (product_id, component_type, component_name, qr_code, is_required)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [product_id, component_type, component_name, qr_code, is_required !== false]);

        logger.info('Product component created:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        logger.error('Error creating product component:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'QR code already exists' });
        }
        if (error.code === '23503') { // Foreign key violation
            return res.status(400).json({ error: 'Product not found' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 製品構成部品更新
app.put('/product-components/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { product_id, component_type, component_name, qr_code, is_required } = req.body;

        // バリデーション
        if (!product_id || !component_type || !component_name || !qr_code) {
            return res.status(400).json({
                error: 'Product ID, component type, name, and QR code are required'
            });
        }

        const result = await pool.query(`
            UPDATE product_components
            SET product_id = $1, component_type = $2, component_name = $3,
                qr_code = $4, is_required = $5, updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `, [product_id, component_type, component_name, qr_code, is_required !== false, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product component not found' });
        }

        logger.info('Product component updated:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error updating product component:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'QR code already exists' });
        }
        if (error.code === '23503') { // Foreign key violation
            return res.status(400).json({ error: 'Product not found' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 製品構成部品削除
app.delete('/product-components/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM product_components WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product component not found' });
        }

        logger.info('Product component deleted:', result.rows[0]);
        res.json({ message: 'Product component deleted successfully' });
    } catch (error) {
        logger.error('Error deleting product component:', error);
        if (error.code === '23503') { // Foreign key violation
            return res.status(409).json({ error: 'Cannot delete: component is referenced by inspection records' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// === QR検品関連API ===

// 製品の同梱物一覧取得
app.get('/products/:productId/components', async (req, res) => {
    try {
        const { productId } = req.params;
        const result = await pool.query(`
            SELECT pc.*, p.product_code, p.product_name
            FROM product_components pc
            JOIN products p ON pc.product_id = p.id
            WHERE pc.product_id = $1
            ORDER BY 
                CASE pc.component_type 
                    WHEN 'main' THEN 1 
                    WHEN 'accessory' THEN 2 
                    WHEN 'manual' THEN 3 
                    WHEN 'warranty' THEN 4 
                    ELSE 5 
                END, pc.component_name
        `, [productId]);
        
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching product components:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 出荷指示IDから製品同梱物取得
app.get('/shipping-instructions/:id/components', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT pc.*, p.product_code, p.product_name, si.quantity, si.instruction_id,
                   i.current_stock, i.available_stock
            FROM shipping_instructions si
            JOIN products p ON si.product_id = p.id
            JOIN product_components pc ON p.id = pc.product_id
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE si.id = $1
            ORDER BY 
                CASE pc.component_type 
                    WHEN 'main' THEN 1 
                    WHEN 'accessory' THEN 2 
                    WHEN 'manual' THEN 3 
                    WHEN 'warranty' THEN 4 
                    ELSE 5 
                END, pc.component_name
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shipping instruction or components not found' });
        }
        
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching shipping instruction components:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// QR検品開始
app.post('/qr-inspections', async (req, res) => {
    try {
        const { shipping_instruction_id, inspector_name } = req.body;
        
        if (!shipping_instruction_id || !inspector_name) {
            return res.status(400).json({ error: 'shipping_instruction_id and inspector_name are required' });
        }
        
        // 出荷指示と製品情報を取得
        const shippingResult = await pool.query(`
            SELECT si.*, p.id as product_id, i.current_stock
            FROM shipping_instructions si
            JOIN products p ON si.product_id = p.id
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE si.id = $1
        `, [shipping_instruction_id]);
        
        if (shippingResult.rows.length === 0) {
            return res.status(404).json({ error: 'Shipping instruction not found' });
        }
        
        const shippingInstruction = shippingResult.rows[0];
        
        // 同梱物数を取得
        const componentsResult = await pool.query(`
            SELECT COUNT(*) as total_components
            FROM product_components
            WHERE product_id = $1 AND is_required = true
        `, [shippingInstruction.product_id]);
        
        const totalComponents = parseInt(componentsResult.rows[0].total_components);
        
        // QR検品記録を作成
        const result = await pool.query(`
            INSERT INTO qr_inspections (
                shipping_instruction_id, inspector_name, product_id,
                total_components, current_stock_before
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            shipping_instruction_id, inspector_name, shippingInstruction.product_id,
            totalComponents, shippingInstruction.current_stock
        ]);
        
        logger.info('QR inspection started:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        logger.error('Error starting QR inspection:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// QRコードスキャン記録
app.post('/qr-inspections/:id/scan', async (req, res) => {
    try {
        const { id } = req.params;
        const { qr_code } = req.body;
        
        if (!qr_code) {
            return res.status(400).json({ error: 'qr_code is required' });
        }
        
        // QR検品記録を取得
        const inspectionResult = await pool.query(`
            SELECT * FROM qr_inspections WHERE id = $1 AND status = 'in_progress'
        `, [id]);
        
        if (inspectionResult.rows.length === 0) {
            return res.status(404).json({ error: 'QR inspection not found or already completed' });
        }
        
        const inspection = inspectionResult.rows[0];
        
        // 製品同梱物をチェック
        const componentResult = await pool.query(`
            SELECT * FROM product_components 
            WHERE product_id = $1 AND qr_code = $2
        `, [inspection.product_id, qr_code]);
        
        if (componentResult.rows.length === 0) {
            // 不正なQRコード
            const errorResult = await pool.query(`
                INSERT INTO qr_inspection_details (
                    qr_inspection_id, qr_code, status, error_message
                ) VALUES ($1, $2, 'error', 'Invalid QR code for this product')
                RETURNING *
            `, [id, qr_code]);
            
            return res.status(400).json({ 
                success: false, 
                message: '対象外のQRコードです',
                data: errorResult.rows[0]
            });
        }
        
        const component = componentResult.rows[0];
        
        // 既にスキャン済みかチェック
        const existingResult = await pool.query(`
            SELECT * FROM qr_inspection_details 
            WHERE qr_inspection_id = $1 AND product_component_id = $2 AND status = 'scanned'
        `, [id, component.id]);
        
        if (existingResult.rows.length > 0) {
            // 重複スキャン
            return res.status(400).json({ 
                success: false, 
                message: '既にスキャン済みです',
                component: component
            });
        }
        
        // スキャン記録を追加
        const scanResult = await pool.query(`
            INSERT INTO qr_inspection_details (
                qr_inspection_id, product_component_id, qr_code, status
            ) VALUES ($1, $2, $3, 'scanned')
            RETURNING *
        `, [id, component.id, qr_code]);
        
        // スキャン済み数を更新
        await pool.query(`
            UPDATE qr_inspections 
            SET scanned_components = (
                SELECT COUNT(*) FROM qr_inspection_details 
                WHERE qr_inspection_id = $1 AND status = 'scanned'
            ),
            updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [id]);
        
        res.json({ 
            success: true, 
            message: 'スキャン成功',
            component: component,
            data: scanResult.rows[0]
        });
    } catch (error) {
        logger.error('Error processing QR scan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// QR検品完了
app.patch('/qr-inspections/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        
        // QR検品記録を取得
        const inspectionResult = await pool.query(`
            SELECT qi.*, si.quantity 
            FROM qr_inspections qi
            JOIN shipping_instructions si ON qi.shipping_instruction_id = si.id
            WHERE qi.id = $1 AND qi.status = 'in_progress'
        `, [id]);
        
        if (inspectionResult.rows.length === 0) {
            return res.status(404).json({ error: 'QR inspection not found or already completed' });
        }
        
        const inspection = inspectionResult.rows[0];
        
        // 全同梱物がスキャン済みかチェック
        const isComplete = inspection.scanned_components >= inspection.total_components;
        const status = isComplete ? 'completed' : 'failed';
        const passedQuantity = isComplete ? inspection.quantity : 0;
        
        // 在庫を更新（検品合格の場合のみ）
        let newStock = inspection.current_stock_before;
        if (isComplete && passedQuantity > 0) {
            const stockResult = await pool.query(`
                UPDATE inventory 
                SET current_stock = current_stock - $1,
                    available_stock = available_stock - $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE product_id = $2
                RETURNING current_stock
            `, [passedQuantity, inspection.product_id]);
            
            newStock = stockResult.rows[0]?.current_stock || inspection.current_stock_before;
        }
        
        // QR検品記録を完了
        const result = await pool.query(`
            UPDATE qr_inspections 
            SET status = $1,
                passed_quantity = $2,
                current_stock_after = $3,
                notes = $4,
                completed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *
        `, [status, passedQuantity, newStock, notes, id]);
        
        // 検品完了の場合、出荷指示のステータスも更新
        if (isComplete) {
            await pool.query(`
                UPDATE shipping_instructions 
                SET status = 'processing',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [inspection.shipping_instruction_id]);
        }
        
        logger.info('QR inspection completed:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error completing QR inspection:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// QR検品詳細取得
app.get('/qr-inspections/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // QR検品記録を取得
        const inspectionResult = await pool.query(`
            SELECT qi.*, si.instruction_id, si.quantity, p.product_code, p.product_name
            FROM qr_inspections qi
            JOIN shipping_instructions si ON qi.shipping_instruction_id = si.id
            JOIN products p ON qi.product_id = p.id
            WHERE qi.id = $1
        `, [id]);
        
        if (inspectionResult.rows.length === 0) {
            return res.status(404).json({ error: 'QR inspection not found' });
        }
        
        // 検品詳細を取得
        const detailsResult = await pool.query(`
            SELECT qid.*, pc.component_name, pc.component_type, pc.qr_code as expected_qr_code
            FROM qr_inspection_details qid
            LEFT JOIN product_components pc ON qid.product_component_id = pc.id
            WHERE qid.qr_inspection_id = $1
            ORDER BY qid.scanned_at DESC
        `, [id]);
        
        res.json({
            inspection: inspectionResult.rows[0],
            details: detailsResult.rows
        });
    } catch (error) {
        logger.error('Error fetching QR inspection:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 出荷検品記録の作成
const shippingInspectionSchema = Joi.object({
    shipping_instruction_id: Joi.number().required(),
    inspector_name: Joi.string().max(100).required(),
    inspected_quantity: Joi.number().min(0).required(),
    passed_quantity: Joi.number().min(0).required(),
    failed_quantity: Joi.number().min(0).default(0),
    defect_details: Joi.string().allow(''),
    packaging_condition: Joi.string().max(50),
    label_check: Joi.boolean().default(false),
    documentation_check: Joi.boolean().default(false),
    final_approval: Joi.boolean().default(false),
    notes: Joi.string().allow('')
});

app.post('/shipping-inspections', async (req, res) => {
    try {
        const { error, value } = shippingInspectionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const {
            shipping_instruction_id,
            inspector_name,
            inspected_quantity,
            passed_quantity,
            failed_quantity,
            defect_details,
            packaging_condition,
            label_check,
            documentation_check,
            final_approval,
            notes
        } = value;

        const result = await pool.query(`
            INSERT INTO shipping_inspections (
                shipping_instruction_id, inspector_name, inspected_quantity,
                passed_quantity, failed_quantity, defect_details,
                packaging_condition, label_check, documentation_check,
                final_approval, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            shipping_instruction_id, inspector_name, inspected_quantity,
            passed_quantity, failed_quantity, defect_details,
            packaging_condition, label_check, documentation_check,
            final_approval, notes
        ]);

        // 最終承認の場合、出荷指示のステータスを更新
        if (final_approval && passed_quantity === inspected_quantity) {
            await pool.query(`
                UPDATE shipping_instructions 
                SET status = 'processing' 
                WHERE id = $1
            `, [shipping_instruction_id]);
        }

        logger.info('Shipping inspection created:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        logger.error('Error creating shipping inspection:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// === レポート関連API ===
app.get('/reports/shipping-summary', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM shipping_inspection_summary
            LIMIT 50
        `);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching shipping summary:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/reports/dashboard-stats', async (req, res) => {
    try {
        const [
            shippingStats,
            inspectionStats,
            inventoryStats
        ] = await Promise.all([
            pool.query(`
                SELECT
                    status,
                    COUNT(*) as count
                FROM shipping_instructions
                GROUP BY status
            `),
            pool.query(`
                SELECT
                    COUNT(*) as total_inspections,
                    SUM(CASE WHEN final_approval THEN 1 ELSE 0 END) as approved_inspections,
                    AVG(passed_quantity::float / NULLIF(inspected_quantity, 0) * 100) as pass_rate
                FROM shipping_inspections
                WHERE inspection_date >= CURRENT_DATE - INTERVAL '30 days'
            `),
            pool.query(`
                SELECT
                    COUNT(*) as total_products,
                    SUM(current_stock) as total_stock,
                    SUM(available_stock) as available_stock
                FROM inventory
            `)
        ]);

        res.json({
            shipping: shippingStats.rows,
            inspection: inspectionStats.rows[0],
            inventory: inventoryStats.rows[0]
        });
    } catch (error) {
        logger.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 本日の検品実績統計
app.get('/reports/daily-inspection-stats', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE) as completed_today,
                COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
                COUNT(*) FILTER (WHERE status = 'failed' AND DATE(completed_at) = CURRENT_DATE) as failed_today,
                COUNT(*) FILTER (WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE) * 100.0 /
                    NULLIF(COUNT(*) FILTER (WHERE (status = 'completed' OR status = 'failed') AND DATE(completed_at) = CURRENT_DATE), 0) as pass_rate_today
            FROM qr_inspections
        `);

        const stats = result.rows[0];

        res.json({
            completed_today: parseInt(stats.completed_today) || 0,
            in_progress: parseInt(stats.in_progress) || 0,
            failed_today: parseInt(stats.failed_today) || 0,
            pass_rate_today: parseFloat(stats.pass_rate_today) || 0
        });
    } catch (error) {
        logger.error('Error fetching daily inspection stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 最近の検品履歴
app.get('/reports/recent-inspections', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;

        const result = await pool.query(`
            SELECT
                qi.id,
                qi.inspector_name,
                qi.status,
                qi.completed_at,
                qi.created_at,
                si.instruction_id,
                p.product_name
            FROM qr_inspections qi
            LEFT JOIN shipping_instructions si ON qi.shipping_instruction_id = si.id
            LEFT JOIN products p ON qi.product_id = p.id
            WHERE qi.status IN ('completed', 'failed')
            ORDER BY COALESCE(qi.completed_at, qi.created_at) DESC
            LIMIT $1
        `, [limit]);

        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching recent inspections:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// === 在庫管理API ===

// 在庫一覧取得
app.get('/inventory', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT i.*, p.product_code, p.product_name, p.category
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            ORDER BY p.product_code
        `);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 在庫詳細取得
app.get('/inventory/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT i.*, p.product_code, p.product_name, p.category
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            WHERE i.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Inventory record not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 在庫調整（現在庫・引当在庫の更新）
app.patch('/inventory/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { current_stock, reserved_stock, location } = req.body;

        // 少なくとも1つのフィールドが必要
        if (current_stock === undefined && reserved_stock === undefined && location === undefined) {
            return res.status(400).json({
                error: 'At least one field (current_stock, reserved_stock, or location) must be provided'
            });
        }

        // 負の値チェック
        if ((current_stock !== undefined && current_stock < 0) ||
            (reserved_stock !== undefined && reserved_stock < 0)) {
            return res.status(400).json({
                error: 'Stock values cannot be negative'
            });
        }

        // 動的にUPDATE文を構築
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (current_stock !== undefined) {
            updates.push(`current_stock = $${paramIndex++}`);
            values.push(current_stock);
        }
        if (reserved_stock !== undefined) {
            updates.push(`reserved_stock = $${paramIndex++}`);
            values.push(reserved_stock);
        }
        if (location !== undefined) {
            updates.push(`location = $${paramIndex++}`);
            values.push(location);
        }
        updates.push(`last_updated = CURRENT_TIMESTAMP`);
        values.push(id);

        const query = `
            UPDATE inventory
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Inventory record not found' });
        }

        logger.info('Inventory updated:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error updating inventory:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 製品IDで在庫取得
app.get('/inventory/by-product/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const result = await pool.query(`
            SELECT i.*, p.product_code, p.product_name, p.category
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            WHERE i.product_id = $1
        `, [productId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Inventory record not found for this product' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error fetching inventory by product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// === データベース管理API ===

// データベース統計情報取得
app.get('/database/stats', async (req, res) => {
    try {
        // テーブル一覧と行数
        const tablesResult = await pool.query(`
            SELECT
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename
        `);

        // 各テーブルの行数を取得
        const tables = [];
        for (const table of tablesResult.rows) {
            const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table.tablename}`);
            tables.push({
                name: table.tablename,
                size: table.size,
                row_count: parseInt(countResult.rows[0].count)
            });
        }

        // データベース全体のサイズ
        const dbSizeResult = await pool.query(`
            SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `);

        res.json({
            database_size: dbSizeResult.rows[0].size,
            table_count: tables.length,
            tables: tables
        });
    } catch (error) {
        logger.error('Error fetching database stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// バックアップ作成
app.post('/database/backup', async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                         new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        const backupDir = '/app/backups';
        const backupFile = `backup_${timestamp}.sql`;
        const backupPath = path.join(backupDir, backupFile);

        // バックアップディレクトリが存在しない場合は作成
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const dbUser = process.env.DB_USER || 'production_user';
        const dbName = process.env.DB_NAME || 'production_db';
        const dbHost = process.env.DB_HOST || 'postgres';
        const dbPassword = process.env.DB_PASSWORD || 'production_password';

        // pg_dumpコマンドを実行
        const command = `PGPASSWORD="${dbPassword}" pg_dump -h ${dbHost} -U ${dbUser} -d ${dbName} > ${backupPath}`;

        await execPromise(command);

        // ファイルサイズを取得
        const stats = fs.statSync(backupPath);
        const fileSizeInBytes = stats.size;
        const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);

        logger.info('Database backup created:', backupFile);

        res.json({
            success: true,
            message: 'バックアップが正常に作成されました',
            filename: backupFile,
            size: `${fileSizeInMB} MB`,
            created_at: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error creating backup:', error);
        res.status(500).json({
            success: false,
            error: 'バックアップの作成に失敗しました',
            details: error.message
        });
    }
});

// バックアップ一覧取得
app.get('/database/backups', async (req, res) => {
    try {
        const backupDir = '/app/backups';

        // ディレクトリが存在しない場合は空配列を返す
        if (!fs.existsSync(backupDir)) {
            return res.json([]);
        }

        const files = fs.readdirSync(backupDir)
            .filter(file => file.endsWith('.sql'))
            .map(file => {
                const filePath = path.join(backupDir, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    size: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
                    created_at: stats.mtime,
                    path: filePath
                };
            })
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json(files);
    } catch (error) {
        logger.error('Error fetching backups:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// === システムログAPI ===

// ログファイル一覧取得
app.get('/logs/files', async (req, res) => {
    try {
        const logDir = '/app';
        const logFiles = ['error.log', 'combined.log'];

        const files = logFiles
            .filter(file => fs.existsSync(path.join(logDir, file)))
            .map(file => {
                const filePath = path.join(logDir, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    size: `${(stats.size / 1024).toFixed(2)} KB`,
                    modified_at: stats.mtime,
                    path: filePath
                };
            });

        res.json(files);
    } catch (error) {
        logger.error('Error fetching log files:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ログ内容取得
app.get('/logs/content/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const { lines = 100, level } = req.query;

        // セキュリティ: ファイル名のバリデーション
        const allowedFiles = ['error.log', 'combined.log'];
        if (!allowedFiles.includes(filename)) {
            return res.status(400).json({ error: 'Invalid log file' });
        }

        const logPath = path.join('/app', filename);

        if (!fs.existsSync(logPath)) {
            return res.status(404).json({ error: 'Log file not found' });
        }

        // ファイルを読み込み
        const content = fs.readFileSync(logPath, 'utf8');
        const allLines = content.split('\n').filter(line => line.trim());

        // レベルフィルタリング
        let filteredLines = allLines;
        if (level) {
            filteredLines = allLines.filter(line => {
                try {
                    const parsed = JSON.parse(line);
                    return parsed.level === level;
                } catch (e) {
                    return line.toLowerCase().includes(level.toLowerCase());
                }
            });
        }

        // 最新N行を取得
        const recentLines = filteredLines.slice(-parseInt(lines));

        // JSON形式でパース試行
        const parsedLines = recentLines.map(line => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return { raw: line };
            }
        }).reverse(); // 新しい順に

        res.json({
            filename,
            total_lines: allLines.length,
            filtered_lines: filteredLines.length,
            returned_lines: parsedLines.length,
            logs: parsedLines
        });
    } catch (error) {
        logger.error('Error reading log file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// エラーハンドリング
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404ハンドラー
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// サーバー起動
app.listen(PORT, () => {
    logger.info(`Production Management API server running on port ${PORT}`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    pool.end();
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    pool.end();
    process.exit(0);
});
