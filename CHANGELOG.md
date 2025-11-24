# Changelog

All notable changes to the Production Management System (生産管理システム) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v2.1.1] - 2025-10-18

### Added
- **Camera Switching Feature**: Implemented dynamic camera switching between environment (rear) and user (front) cameras
  - New `switchCamera()` method in QRScannerManager
  - UI button for toggling cameras with visual feedback
  - Proper cleanup and reinitialization on camera switch
- **Deployment Verification System**: Added comprehensive deployment verification tools
  - `quick-deploy.sh` script for rapid rsync deployment
  - Pre-deployment backup creation
  - Post-deployment verification checks
  - Automated service restart with health checks

### Changed
- **safari2.html Improvements**: Enhanced mobile QR inspection interface
  - Better error handling for camera initialization
  - Improved UI feedback during camera operations
  - Enhanced scan region calculation for different device sizes
  - More robust state management during camera switching
- **Deployment Process**: Streamlined deployment workflow
  - Rsync-based deployment replaces manual file transfers
  - Excludes unnecessary files (backups/, .git/, node_modules/, etc.)
  - Automatic nginx reload after deployment
  - Service health verification post-deployment

### Fixed
- Camera switching now properly releases previous camera resources
- Safari2.html state management improved to prevent memory leaks
- Deployment script handles service restarts more reliably

### Deployment Information
- **Date**: 2025-10-18
- **Deployment Method**: rsync via quick-deploy.sh
- **Verification**: All services verified operational post-deployment
- **Downtime**: < 5 seconds (service restart only)

---

## [v2.1] - 2025-10-16

### Added
- **BFCache (Back-Forward Cache) Support**: Full implementation for Safari navigation
  - `pageshow` event handler for cache restoration detection
  - `pagehide` event handler for proper cleanup before caching
  - Session storage for scanner state persistence
  - Automatic scanner reinitialization after BFCache restoration
  ```javascript
  window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
          // BFCache restore detected - reinitialize scanner
          this.cleanupResources();
          const wasActive = sessionStorage.getItem('qr-scanner-was-active');
          if (wasActive === 'true') {
              setTimeout(() => this.resetAndStart(), 300);
          }
      }
  });
  ```
- **Enhanced Camera Calibration**: Extended calibration timing for improved stability
  - Initial calibration: 4 seconds (increased from 2.5s)
  - Subsequent calibrations: 2 seconds
  - Device-specific timing adjustments (iPad vs iPhone)
  - `waitForFirstFrame` implementation for reliable camera readiness
- **QrScanner Library Integration**: Migrated from BarcodeDetector API to QrScanner v1.4.2 UMD
  - Better iOS Safari compatibility
  - Fallback support for older browsers
  - Consistent scanning performance across devices
  - Worker-based scanning for better performance

### Changed
- **Camera Initialization Flow**: Improved reliability on iOS devices
  - Added `waitForFirstFrame` method to ensure camera is fully initialized
  - Better error handling for camera permission issues
  - More descriptive error messages for users
- **Scan Rate Optimization**: Device-specific scan rates
  - iOS: 3 scans/second (maxScansPerSecond: 3)
  - Other devices: 5 scans/second (maxScansPerSecond: 5)
- **Resource Cleanup**: Enhanced cleanup procedures
  - Proper video stream track stopping
  - MediaStream cleanup on scanner destruction
  - Memory leak prevention on page navigation

### Fixed
- **iOS Safari Camera Issues**: Resolved multiple camera-related bugs
  - Camera not releasing properly on page navigation
  - Black screen after returning from BFCache
  - Video feed freezing on rapid navigation
- **Cache Persistence Problems**: Implemented comprehensive cache busting
  - Added version parameters to all script includes (`?v=20251015-1400`)
  - Meta tags for cache control
  - nginx header configuration for aggressive cache disabling
- **Barcode Detection Errors**: Fixed BarcodeDetector API unavailability on iOS Safari
  - Replaced native API with QrScanner library
  - Better error messages when camera is unavailable

### Deployment Information
- **Date**: 2025-10-16
- **Commits**:
  - BFCache integration: 194 insertions, 22 files changed
  - QR scanner brushup: 84 insertions, 13 deletions, 6 files changed
- **Testing**: Verified on Safari 18.6+ (iPad/iPhone)

---

## [v2.0] - 2025-10-14

### Added
- **Device Detection and Optimization**: iPad and iPhone specific optimizations
  - User agent-based device detection
  - Device-specific scanner configuration
  - Adaptive scan rates and calibration timing
  ```javascript
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isIPad = /iPad/.test(navigator.userAgent) ||
                 (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
  ```
- **QR Inspection System v2.0**: Complete rebuild of inspection workflow
  - 12-step inspection process
  - Real-time component scanning progress
  - Visual feedback for scan success/failure
  - Automatic inspection completion detection
- **Database Schema Enhancement**: New QR inspection tables
  - `qr_inspections`: Main inspection records
  - `qr_inspection_details`: Individual component scan records
  - `product_components`: QR code mapping for product components
- **API Endpoints for QR Inspection**:
  - `POST /api/qr-inspections`: Create new inspection
  - `POST /api/qr-inspections/:id/scan`: Record component scan
  - `PATCH /api/qr-inspections/:id/complete`: Complete inspection
  - `GET /api/qr-inspections/:id`: Get inspection details

### Changed
- **Scanner Performance**: Optimized for mobile devices
  - Reduced scan rate on iOS to prevent CPU overload
  - Implemented dynamic scan region calculation
  - Better video resolution selection for mobile cameras
- **UI/UX Improvements**: Mobile-first design for inspection interface
  - Larger touch targets for mobile devices
  - Better visual feedback during scanning
  - Progress indicators for multi-component inspections
  - Responsive design for various screen sizes

### Fixed
- Initial camera initialization delays on iOS
- Video feed aspect ratio issues on different devices
- Memory leaks during extended scanning sessions

### Deployment Information
- **Date**: 2025-10-14
- **Target Devices**: iPad, iPhone (iOS 14+)
- **Browser Support**: Safari 14+, Chrome 90+

---

## [Infrastructure Updates] - October 2025

### AWS Deployment Setup

#### RDS SSL Connection Fix - 2025-10-17
**Problem**: PostgreSQL connection errors due to missing SSL configuration
```
error: no pg_hba.conf entry for host "10.0.1.250", user "admin",
database "production_management", no encryption
```

**Solution Implemented**:
- Added SSL configuration to PostgreSQL connection pool in `api/server.js`
```javascript
const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'production_db',
    user: process.env.DB_USER || 'production_user',
    password: process.env.DB_PASSWORD || 'production_pass',
    ssl: {
        rejectUnauthorized: false  // RDS self-signed certificate support
    }
});
```
- Fixed systemd service file with correct database credentials
- Verified all API endpoints operational (5 shipping instructions retrieved)

**Result**: All API endpoints returning 200 OK status

#### HTTPS Setup Complete - 2025-10-17
**Implementation**:
- Self-signed SSL certificate deployed to EC2
  - Certificate: `/etc/nginx/ssl/server.crt`
  - Private key: `/etc/nginx/ssl/server.key`
  - Valid until: 2026-10-14
- nginx HTTPS configuration
  - Port 443 with SSL/TLS enabled
  - HTTP/2 support active
  - TLS protocols: v1.2, v1.3
  - Automatic HTTP to HTTPS redirect (301)

**Access URLs**:
- HTTPS: `https://57.180.82.161/`
- API: `https://57.180.82.161/api/health`
- HTTP redirects automatically to HTTPS

**Certificate Details**:
```
Subject: C=JP, ST=Tokyo, L=Tokyo, O=Production Management System,
         OU=QR Inspection, CN=57.180.82.161
Issuer: C=JP, ST=Tokyo, L=Tokyo, O=Production Management System,
        OU=QR Inspection, CN=57.180.82.161
Valid: 2025-10-14 to 2026-10-14
```

**Mobile Access**: QR scanner camera access now works on iOS (requires HTTPS)

#### Rsync Deployment Setup - 2025-10-16
**Quick Deploy Script** (`quick-deploy.sh`):
- Rsync-based file synchronization to EC2
- Automatic backup creation before deployment
- Excludes: `backups/`, `.git/`, `node_modules/`, `postgres-data/`
- Post-deployment verification:
  - Service status checks
  - nginx reload
  - API health endpoint verification

**Usage**:
```bash
./quick-deploy.sh
# Output:
# - Backup created: backups/backup-YYYY-MM-DD-HHMMSS.tar.gz
# - Files synced to EC2
# - nginx reloaded
# - Services verified
```

**Deployment Performance**:
- Average deployment time: 10-15 seconds
- Zero downtime during file sync
- Automatic rollback available via backups

### Infrastructure Specifications

**AWS Resources** (Terraform-managed):
- **EC2**: t3.micro instance
  - OS: Amazon Linux 2023
  - Services: nginx, Node.js API
  - Public IP: 57.180.82.161
- **RDS**: PostgreSQL 15
  - Instance: db.t3.micro
  - Database: production_db
  - SSL: Required (rds.force_ssl = 1)
  - Endpoint: `poc-production-db.cq2xwbsd3tni.ap-northeast-1.rds.amazonaws.com`
- **Security Groups**:
  - EC2: Ports 22, 80, 443, 3000
  - RDS: Port 5432 (from EC2 security group only)

**Cost Management**:
- Auto-scheduler enabled via EventBridge
- Start: 9:00 JST (Mon-Fri)
- Stop: 19:00 JST (Mon-Fri)
- Estimated cost: $19-24/month (160 hours operation)

---

## [v1.0] - 2025-10-01 (Initial Release)

### Added
- **Core Production Management System**: Initial system deployment
  - Product master data management
  - Shipping instruction creation and tracking
  - Traditional shipping inspection workflow
  - Inventory management with automatic stock updates
- **Database Schema**: PostgreSQL database with core tables
  - `products`: Product master data
  - `shipping_instructions`: Shipping orders
  - `shipping_inspections`: Traditional inspection records
  - `inventory`: Stock management with generated columns
  - `shipping_locations` / `delivery_locations`: Master location data
- **RESTful API** (Node.js + Express):
  - Product CRUD operations
  - Shipping instruction management
  - Location master data endpoints
  - Health check endpoint
- **Web Application**: Vanilla JavaScript SPA
  - Dashboard with statistics
  - Shipping instruction list with filtering
  - Basic inspection form
  - Inventory view
- **Docker Deployment**: Complete Docker Compose setup
  - nginx reverse proxy
  - Node.js API container
  - PostgreSQL database
  - Optional Grafana + Prometheus monitoring

### Technical Stack
- **Frontend**: Vanilla JavaScript (ES6+), Bootstrap 5, HTML5
- **Backend**: Node.js 18+ (Express)
- **Database**: PostgreSQL 15
- **Reverse Proxy**: nginx 1.25
- **Container**: Docker Compose

### Deployment
- **Platform**: Docker in WSL2
- **Management**: `./manage.sh` script for system operations
- **Monitoring**: Optional Grafana + Prometheus stack

---

## Version Comparison Summary

| Feature | v1.0 | v2.0 | v2.1 | v2.1.1 |
|---------|------|------|------|--------|
| Traditional Inspection | ✅ | ✅ | ✅ | ✅ |
| QR-based Inspection | ❌ | ✅ | ✅ | ✅ |
| iOS Safari Support | ⚠️ Basic | ✅ Optimized | ✅ Enhanced | ✅ Enhanced |
| BarcodeDetector API | ❌ | ⚠️ Attempted | ❌ Removed | ❌ Removed |
| QrScanner Library | ❌ | ❌ | ✅ v1.4.2 | ✅ v1.4.2 |
| BFCache Support | ❌ | ❌ | ✅ Full | ✅ Full |
| Camera Switching | ❌ | ❌ | ❌ | ✅ Dynamic |
| Device Detection | ❌ | ✅ Basic | ✅ Enhanced | ✅ Enhanced |
| Calibration Timing | N/A | 2.5s | 4s initial, 2s subsequent | 4s initial, 2s subsequent |
| Scan Rate (iOS) | N/A | 5/sec | 3/sec | 3/sec |
| Cache Management | Basic | ⚠️ Issues | ✅ Comprehensive | ✅ Comprehensive |
| AWS Deployment | ❌ | ❌ | ⚠️ Manual | ✅ Automated |
| HTTPS Support | ❌ | ❌ | ✅ Self-signed | ✅ Self-signed |
| Rsync Deployment | ❌ | ❌ | ❌ | ✅ quick-deploy.sh |

---

## Migration Notes

### Upgrading from v2.1 to v2.1.1
**No breaking changes.** Deployment can be performed with zero downtime using `quick-deploy.sh`.

**Steps**:
1. Run `./quick-deploy.sh` from project root
2. Verify services after deployment
3. Test camera switching feature on mobile devices

### Upgrading from v2.0 to v2.1
**Breaking changes**: BarcodeDetector API removed

**Migration required**:
1. Update all QR scanner implementations to use QrScanner library
2. Remove BarcodeDetector API references
3. Implement BFCache event handlers
4. Update cache control headers
5. Test on iOS Safari 14+ and Chrome 90+

**Database**: No schema changes required

### Upgrading from v1.0 to v2.0
**Breaking changes**: Database schema additions

**Migration required**:
1. Run SQL migration to add QR inspection tables:
   - Execute `postgres/init/02-qr-inspection-tables.sql`
2. Update API to include new QR inspection endpoints
3. Deploy new mobile-optimized inspection interfaces
4. Test complete inspection workflow

**Backwards compatibility**: Traditional inspection workflow remains unchanged

---

## Browser Compatibility

### Current Support (v2.1.1)
- **iOS Safari**: 14.0+ (optimized for 18.6+)
- **Chrome (Mobile)**: 90+
- **Chrome (Desktop)**: 90+
- **Edge**: 90+
- **Firefox**: Limited (QR scanner may have issues)

### Known Issues
- **Firefox**: BarcodeDetector API not available, QrScanner performance varies
- **iOS Safari < 14**: Camera API compatibility issues
- **Chrome < 90**: QrScanner library may not load

---

## Security Considerations

### Current Implementation
- **SSL/TLS**: Self-signed certificate (development/POC)
- **Database**: SSL required for RDS connections
- **API**: Rate limiting enabled (proxy-aware)
- **Headers**: Security headers via helmet middleware

### Production Recommendations
1. **SSL Certificate**: Replace self-signed cert with Let's Encrypt or commercial certificate
2. **Secrets Management**: Use AWS Secrets Manager for database credentials
3. **HSTS**: Enable HTTP Strict Transport Security
4. **CSP**: Implement Content Security Policy headers
5. **Database**: Review user permissions (principle of least privilege)

---

## Related Documentation

- **[QR Scanner Guide](docs/QR_SCANNER_GUIDE.md)**: Comprehensive QR scanner implementation documentation
- **[QR Inspection Guide](docs/QR_INSPECTION_GUIDE.md)**: Complete QR inspection system guide
- **[Safari/iOS Optimization](docs/SAFARI_IOS_OPTIMIZATION.md)**: iOS Safari optimization strategies
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)**: AWS deployment and operations guide
- **[CLAUDE.md](CLAUDE.md)**: Project overview and development guidelines

---

## Contributors

This changelog documents work completed on the Production Management System QR inspection enhancement project during October 2025.

For questions or issues, please refer to the documentation files listed above.
