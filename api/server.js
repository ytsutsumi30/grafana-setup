const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const { Pool } = require('pg');
const Joi = require('joi');

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
