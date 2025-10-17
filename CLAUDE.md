# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Overview

This is a Japanese production management system (生産管理システム) running on Docker in WSL2. The system manages the complete workflow from production planning through shipping inspection, with PostgreSQL database backend and optional Grafana/Prometheus monitoring.

**Core Technology Stack:**
- Frontend: Vanilla JavaScript (ES6+), Bootstrap 5, HTML5
- Backend: Node.js 18+ (Express)
- Database: PostgreSQL 15
- Reverse Proxy: nginx (with SSL/TLS support)
- Monitoring: Grafana + Prometheus (optional, profile-based)
- Container: Docker Compose

## Key Commands

### System Management
All system operations use the `./manage.sh` script:

```bash
# Core operations
./manage.sh start          # Start main services (nginx, API, postgres)
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
# Direct PostgreSQL access
docker-compose exec postgres psql -U production_user -d production_db

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
docker-compose logs postgres
```

## Architecture

### Service Communication Flow

```
Client Browser
    ↓ (HTTP/HTTPS :80/:443)
nginx (reverse proxy + static files)
    ↓ /api/* → http://production-api:3001/
    ↓ /grafana/* → http://grafana:3000/ (when monitoring enabled)
    ↓ /prometheus/* → http://prometheus:9090/ (when monitoring enabled)
Node.js API (Express)
    ↓ pg connection pool
PostgreSQL Database
```

### Database Schema Architecture

The database has two initialization scripts executed in order:
- `postgres/init/01-init.sql`: Core tables (products, shipping, inventory, inspections)
- `postgres/init/02-qr-inspection-tables.sql`: QR inspection system tables

**Key Table Relationships:**
- `products` → `shipping_instructions` → `shipping_inspections` (traditional inspection flow)
- `products` → `product_components` (QR code mapping for each product component)
- `shipping_instructions` → `qr_inspections` → `qr_inspection_details` (QR-based inspection flow)
- `shipping_locations` / `delivery_locations` (master data for shipping/delivery addresses)

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

**Key API Patterns:**
- QR inspection workflow: POST `/qr-inspections` → POST `/qr-inspections/:id/scan` (multiple times) → PATCH `/qr-inspections/:id/complete`
- Inventory updates happen automatically on QR inspection completion
- Uses Joi for request validation on POST endpoints
- All timestamps use PostgreSQL `CURRENT_TIMESTAMP`

### Frontend Architecture

The main application (`web/index.html` + `web/app.js`) is a single-page application with manual routing:
- **SPA Navigation**: `navigateToPage()` function handles view switching without page reload
- **Global state**: `products`, `shippingInstructions` arrays cached at module level
- **Page modules**: Dashboard, Shipping, Inspection, Inventory views dynamically loaded
- **Bootstrap 5** for UI components, no build process required

**Special Pages:**
- `safari.html` / `ship.html` - Mobile-optimized QR scanner interfaces for iOS Safari
- `shipping-inspection-mockup.html` - Shipping inspection form
- `ItemPicking.html` - Item picking workflow
- QR Scanner modules in `web/js/qr-scanner.js` with iOS Safari-specific optimizations

### Docker Compose Profiles

The system uses Docker Compose profiles to separate core services from monitoring:
- **Default profile** (no profile flag): nginx, production-api, postgres
- **monitoring profile**: grafana, prometheus (use `--profile monitoring` or via manage.sh)

This separation allows running the production system without heavy monitoring overhead.

### nginx Configuration

Key behaviors in `nginx/conf.d/default.conf`:
- **Dual HTTP/HTTPS**: Port 80 and 443 (self-signed cert in `ssl/`)
- **Aggressive cache disabling**: iOS Safari cache workarounds with `if_modified_since off`, `etag off`
- **Monitoring endpoints**: Dynamically managed by `manage.sh monitoring start/stop` which creates/removes `nginx/conf.d/monitoring.conf`
- **Proxy settings**: Trusts X-Forwarded-* headers for real client IP (rate limiting)

## Important Development Notes

### Database Migrations
There is no migration system. Schema changes require:
1. Modify `postgres/init/*.sql` files
2. Run `./manage.sh clean` (WARNING: destroys all data)
3. Run `./manage.sh start` to recreate with new schema

For production, manually write ALTER statements.

### QR Scanner iOS Compatibility
The QR scanner has extensive iOS Safari-specific handling:
- Uses BarcodeDetector API when available (Chrome, newer Safari)
- Falls back to jsQR library for older browsers
- Implements camera permission detection and guidance
- Cache-busting headers are critical for iOS Safari to pick up new JS changes

### Environment Variables
Database credentials and settings in `docker-compose.yml`:
- `POSTGRES_*`: Database configuration
- `DB_*`: API server database connection
- No `.env` file by default (values hardcoded in docker-compose.yml)

### Monitoring System Management
The monitoring stack (Grafana/Prometheus) is intentionally separated:
- Started/stopped independently from main system
- nginx configuration for /grafana/ and /prometheus/ paths is dynamically injected
- This prevents monitoring from impacting core production operations

## Common Patterns

### Adding New API Endpoints
1. Add route handler in `api/server.js` (grouped by domain)
2. Use `pool.query()` for database access with parameterized queries ($1, $2, etc.)
3. Add Joi validation schema for POST/PATCH endpoints
4. Log with `logger.info()` / `logger.error()`
5. Return proper HTTP status codes (201 for creation, 404 for not found)

### Adding Database Tables
1. Add CREATE TABLE to appropriate `postgres/init/*.sql` file
2. Include indexes for foreign keys and frequently queried columns
3. Add GRANT statement at end of file for `production_user`
4. Test with `./manage.sh clean && ./manage.sh start`

### Updating Frontend
1. Modify HTML in `web/*.html` or JavaScript in `web/app.js` or `web/js/*.js`
2. No build step required - changes are immediately available
3. For iOS Safari testing, ensure nginx cache headers are active to force reload
4. Use `api` object methods for backend communication (defined in `web/app.js`)
