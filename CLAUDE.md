# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Overview

This is a Japanese production management system (生産管理システム) deployed on AWS (EC2 + RDS) with Docker containers. The system manages the complete workflow from production planning through shipping inspection, with PostgreSQL (RDS) database backend, OCR capabilities (AWS Textract / GCP Document AI), QC analysis tools, and optional Grafana/Prometheus monitoring.

**Core Technology Stack:**
- Frontend: Vanilla JavaScript (ES6+), Bootstrap 5, HTML5 (no build step)
- Backend: Node.js 18+ (Express)
- Database: PostgreSQL 15 on AWS RDS (local postgres container available but commented out)
- Reverse Proxy: nginx:alpine (with optional SSL/TLS support)
- OCR: AWS Textract, GCP Document AI (optional)
- Monitoring: Grafana + Prometheus (optional, Docker Compose profile-based)
- Infrastructure: Terraform (AWS VPC, EC2, RDS, ALB, Scheduler)
- Container: Docker Compose

## Key Commands

### System Management
All system operations use the `./manage.sh` script:

```bash
# Core operations
./manage.sh start          # Start main services (nginx, API)
./manage.sh stop           # Stop main services
./manage.sh restart        # Restart main services
./manage.sh status         # Check service health
./manage.sh logs           # View real-time logs

# Monitoring stack (separate profile)
./manage.sh monitoring start   # Start Grafana + Prometheus (dynamically adds nginx config)
./manage.sh monitoring stop    # Stop monitoring stack (removes nginx config)
./manage.sh monitoring status  # Check monitoring status

# Maintenance
./manage.sh backup         # Backup PostgreSQL database to backups/
./manage.sh clean          # Complete cleanup (removes all data)
```

### Database Operations

```bash
# Direct PostgreSQL access (when using local container)
docker-compose exec postgres psql -U production_user -d production_db

# For RDS, use psql with the RDS endpoint:
# psql -h poc-production-db.cj4ycmcqcrbj.ap-northeast-1.rds.amazonaws.com -U production_user -d production_db

# Manual backup/restore
docker-compose exec postgres pg_dump -U production_user production_db > backup.sql
docker-compose exec -T postgres psql -U production_user -d production_db < backup.sql
```

### Development

```bash
# API development (inside container)
docker-compose exec production-api npm install
docker-compose logs -f production-api

# View specific service logs
docker-compose logs nginx
docker-compose logs production-api
```

### Terraform (Infrastructure)

```bash
cd terraform/
terraform init
terraform plan
terraform apply
# See terraform/README.md for detailed instructions
```

## Architecture

### Service Communication Flow

```
Client Browser
    ↓ (HTTP :80 / HTTPS :443 optional)
nginx (reverse proxy + static files)
    ├─ / and /web/*  → static files from ./web/
    ├─ /api/*        → http://production-api:3000/
    ├─ /grafana/*    → http://grafana:3000/ (when monitoring enabled)
    └─ /prometheus/* → http://prometheus:9090/ (when monitoring enabled)
Node.js API (Express, port 3000)
    ↓ pg connection pool (with SSL)
PostgreSQL Database (AWS RDS or local container)
```

### Docker Compose Services

Current deployment uses two active services (postgres is commented out, using RDS instead):
- **nginx** (port 80, 443): Reverse proxy and static file serving
- **production-api** (port 3000): Node.js Express API server
- **grafana** (monitoring profile): Dashboard visualization
- **prometheus** (monitoring profile): Metrics collection

### Database Schema Architecture

The database has four initialization scripts executed in order:
- `postgres/init/01-init.sql`: Core tables (products, production_plans, shipping, inventory, inspections, delivery/shipping locations)
- `postgres/init/02-qr-inspection-tables.sql`: QR inspection system (product_components, qr_inspections, qr_inspection_details)
- `postgres/init/03-inspectors-table.sql`: Inspector master data with roles (inspector, supervisor, admin)
- `postgres/init/03-new-qc-tools-tables.sql`: QC Seven Tools tables (affinity/KJ, relation diagrams, tree/systematic, matrix, matrix data analysis/PCA, arrow/PERT diagrams, PDPC)
- `postgres/init/04-monitoring-tables.sql`: Monitoring & analytics (metrics timeseries, inventory snapshots, inspection performance, alerts, demand forecasts, ABC analysis) + views (v_inventory_health, v_inspector_performance)

**Key Table Relationships:**
- `products` → `shipping_instructions` → `shipping_inspections` (traditional inspection flow)
- `products` → `product_components` (QR code mapping for each product component)
- `shipping_instructions` → `qr_inspections` → `qr_inspection_details` (QR-based inspection flow)
- `shipping_locations` / `delivery_locations` (master data for shipping/delivery addresses)
- `inspectors` (inspector master with roles and departments)
- `qc_analysis_projects` → various QC tool tables (affinity cards, relation nodes/edges, tree nodes, matrix items/cells, arrow tasks/dependencies, PDPC nodes)
- `metrics_timeseries`, `inventory_snapshots`, `monitoring_alerts`, `demand_forecast`, `abc_analysis` (analytics)

**Important Generated Column:**
- `inventory.available_stock` is a GENERATED column (`current_stock - reserved_stock`). Never insert/update this directly.

### API Architecture

The Express API (`api/server.js`) follows a functional pattern with:
- **Middleware stack**: helmet, cors, rate limiting (proxy-aware), Winston logging
- **RESTful endpoints** organized by domain:
  - `/products*` - Product master data
  - `/shipping-instructions*` - Shipping order management with complex filtering
  - `/shipping-locations`, `/delivery-locations` - Location master data
  - `/shipping-inspections` - Traditional inspection workflow
  - `/qr-inspections*` - QR code-based inspection workflow
  - `/reports/*` - Dashboard and summary statistics
  - `/inspectors*` - Inspector management
- **Route modules** in `api/routes/`:
  - `ocr.js` - AWS Textract OCR endpoint (POST `/api/ocr/textract`)
  - `ocr-enhance.js` - Enhanced OCR processing
  - `ocr-ai.js` - AI-powered OCR
  - `ocr-feedback.js` - OCR feedback/training loop
- **Services** in `api/services/`:
  - `textract.js` - AWS Textract integration

**Key API Patterns:**
- QR inspection workflow: POST `/qr-inspections` → POST `/qr-inspections/:id/scan` (multiple times) → PATCH `/qr-inspections/:id/complete`
- Inventory updates happen automatically on QR inspection completion
- Uses Joi for request validation on POST endpoints
- All timestamps use PostgreSQL `CURRENT_TIMESTAMP`
- OCR endpoints accept base64-encoded images and return extracted text with confidence scores

**Dependencies** (from `api/package.json`):
- express, pg, cors, helmet, winston, joi, express-rate-limit
- @aws-sdk/client-textract (AWS Textract OCR)
- dotenv (environment configuration)
- nodemon (dev dependency)

### Frontend Architecture

The main application (`web/index.html` + `web/app.js`) is a single-page application with manual routing:
- **SPA Navigation**: `navigateToPage()` function handles view switching without page reload
- **Global state**: `products`, `shippingInstructions` arrays cached at module level
- **Page modules**: Dashboard, Shipping, Inspection, Inventory views dynamically loaded
- **Bootstrap 5** for UI components, no build process required
- **PWA support**: `web/manifest.json` for add-to-homescreen capability

**Frontend File Organization:**
- `web/*.html` - Page templates (46 HTML files including variants and backups)
- `web/app.js` - Core SPA application logic
- `web/styles.css` - Global styles
- `web/css/` - Organized stylesheets:
  - `main.css`, `mobile.css`, `qr-scanner.css`, `delivery.css`, `device-mode.css`, `map.css`
- `web/js/` - JavaScript modules:
  - `app.js`, `qr-scanner.js`, `qr-inspection-app.js` - Core app and QR scanning
  - `ocr-module.js`, `ocr-engine-enhanced.js`, `universal-ocr.js` - OCR functionality
  - `image-preprocessor.js`, `image-preprocessing.js` - Image processing
  - `qc-dashboard.js`, `new-qc-analysis.js` - QC analysis tools
  - `monitoring-dashboard.js` - Real-time monitoring
  - `device-mode.js` - Device mode switching (desktop/mobile)
  - `shipping-instruction-maintenance.js` - Shipping maintenance
- `web/modules/` and `web/js/modules/` - Shared modules:
  - `qr-scanner.js`, `inventory-manager.js`, `delivery-map.js`

**Key Pages:**
- `index.html` - Primary SPA entry point
- `safari.html` / `safari2.html` / `safari3.html` / `safari4.html` - Progressive iOS Safari-optimized QR scanner versions
- `android.html` / `qr-ins-android.html` - Android-optimized interfaces
- `ship.html` - Mobile shipping interface
- `qr-inspection.html` / `qr-inspection-v2.1.html` - QR inspection workflows
- `qc-analysis.html` / `qc-dashboard.html` - Quality control analysis tools
- `ocr.html` / `ocr-enhanced.html` / `ocr-v2-enhanced.html` - OCR interfaces
- `monitoring.html` - Real-time monitoring dashboard
- `shipping-inspection-mockup.html` - Shipping inspection form
- `ItemPicking.html` - Item picking workflow
- `camera-test.html` - Camera API testing
- `exhibition-flyer.html` - System showcase flyer

### Docker Compose Profiles

The system uses Docker Compose profiles to separate core services from monitoring:
- **Default profile** (no profile flag): nginx, production-api (postgres commented out - uses RDS)
- **monitoring profile**: grafana, prometheus (use `--profile monitoring` or via manage.sh)

This separation allows running the production system without heavy monitoring overhead.

### nginx Configuration

Key behaviors in `nginx/conf.d/default.conf`:
- **HTTP on port 80** (HTTPS on 443 available but commented out by default)
- **Static file serving**: `/web/` alias and `/` root both point to `./web/` directory
- **API proxy**: `/api/*` → `http://production-api:3000/` with path rewrite
- **Aggressive cache disabling**: iOS Safari cache workarounds with `if_modified_since off`, `etag off`, `Cache-Control: no-cache, no-store`
- **Monitoring endpoints**: Dynamically managed by `manage.sh monitoring start/stop` which creates/removes `nginx/conf.d/monitoring.conf`
- **Health check**: `/health` returns "healthy" (no access log)
- **Security headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy

### AWS Infrastructure (Terraform)

The `terraform/` directory manages AWS deployment:
- **Modules**: VPC, EC2, RDS, ALB, Scheduler
- **Key resources**: EC2 instance with Docker, RDS PostgreSQL, VPC networking, Application Load Balancer
- **Region**: ap-northeast-1 (Tokyo)

## Important Development Notes

### Database Migrations
There is no migration system. Schema changes require:
1. Modify `postgres/init/*.sql` files
2. Run `./manage.sh clean` (WARNING: destroys all data)
3. Run `./manage.sh start` to recreate with new schema

For production (RDS), manually write ALTER statements. Migration scripts can be placed in `postgres/migrations/`.

### QR Scanner iOS Compatibility
The QR scanner has extensive iOS Safari-specific handling:
- Uses BarcodeDetector API when available (Chrome, newer Safari)
- Falls back to jsQR library for older browsers
- Implements camera permission detection and guidance
- Cache-busting headers are critical for iOS Safari to pick up new JS changes
- Multiple Safari-optimized page versions (safari.html through safari4.html) for progressive improvements

### Environment Variables
- **docker-compose.yml**: Contains DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL settings
- **api/.env**: Additional environment file loaded via `env_file` directive
- **AWS credentials**: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (for Textract)
- **GCP credentials**: GOOGLE_APPLICATION_CREDENTIALS, DOCUMENTAI_PROJECT_ID, DOCUMENTAI_LOCATION, DOCUMENTAI_PROCESSOR_ID (for Document AI)
- **Secrets**: GCP service account key mounted from `./secrets/` directory (read-only)

### Monitoring System Management
The monitoring stack (Grafana/Prometheus) is intentionally separated:
- Started/stopped independently from main system
- nginx configuration for /grafana/ and /prometheus/ paths is dynamically injected
- This prevents monitoring from impacting core production operations

### OCR System
The system supports OCR via multiple backends:
- **AWS Textract**: Primary OCR engine, configured via AWS credentials
- **GCP Document AI**: Alternative engine, configured via service account key in `./secrets/`
- OCR routes are modularized in `api/routes/ocr*.js`
- Frontend OCR interfaces in `web/ocr*.html` with image preprocessing support

## Common Patterns

### Adding New API Endpoints
1. Add route handler in `api/server.js` (grouped by domain) or create a new route module in `api/routes/`
2. Use `pool.query()` for database access with parameterized queries ($1, $2, etc.)
3. Add Joi validation schema for POST/PATCH endpoints
4. Log with `logger.info()` / `logger.error()`
5. Return proper HTTP status codes (201 for creation, 404 for not found)

### Adding Database Tables
1. Add CREATE TABLE to appropriate `postgres/init/*.sql` file
2. Include indexes for foreign keys and frequently queried columns
3. Add GRANT statement at end of file for `production_user`
4. Grant sequence permissions: `GRANT ALL PRIVILEGES ON SEQUENCE <table>_id_seq TO production_user`
5. Test with `./manage.sh clean && ./manage.sh start`

### Updating Frontend
1. Modify HTML in `web/*.html` or JavaScript in `web/app.js` or `web/js/*.js`
2. No build step required - changes are immediately available
3. For iOS Safari testing, ensure nginx cache headers are active to force reload
4. Use `api` object methods for backend communication (defined in `web/app.js`)
5. CSS changes go in `web/css/` (organized by concern: main, mobile, qr-scanner, etc.)

### Project Directory Structure
```
grafana-setup/
├── api/                    # Node.js Express API
│   ├── server.js           # Main server with all core endpoints
│   ├── routes/             # Modular route handlers (OCR)
│   ├── services/           # External service integrations (Textract)
│   ├── migrations/         # SQL migration scripts
│   └── package.json
├── web/                    # Frontend static files (served by nginx)
│   ├── index.html          # Main SPA entry point
│   ├── app.js              # Core SPA logic
│   ├── css/                # Stylesheets (main, mobile, qr-scanner, etc.)
│   ├── js/                 # JavaScript modules
│   │   ├── modules/        # Shared modules (qr-scanner, inventory, delivery)
│   │   └── *.js            # Feature-specific scripts
│   ├── modules/            # Additional shared modules
│   └── *.html              # Page templates and mobile-optimized variants
├── postgres/
│   ├── init/               # DB initialization scripts (01-04, executed in order)
│   ├── migrations/         # Manual migration scripts
│   └── scripts/            # Data insertion scripts
├── nginx/
│   ├── nginx.conf          # Main nginx config
│   └── conf.d/
│       └── default.conf    # Server block configuration
├── grafana/provisioning/   # Grafana datasource provisioning
├── prometheus/             # Prometheus scrape configuration
├── terraform/              # AWS infrastructure (VPC, EC2, RDS, ALB, Scheduler)
├── ssl/                    # SSL certificates (self-signed)
├── secrets/                # Service account keys (not in git)
├── docs/                   # API and design documentation
├── doc/                    # Operational guides and AWS deployment docs
├── md/                     # Detailed reports and deployment logs (60+ files)
├── docker-compose.yml      # Container orchestration
├── manage.sh               # System management script
└── CLAUDE.md               # This file
```
