# Shipping Inspection System

Production management system with QR-based shipping inspection running on Docker in WSL2.

---

## 🌟 Features

- **QR Code Inspection**: iOS Safari-optimized QR scanner for shipping inspections
- **Production Management**: From planning to shipment
- **Inventory Management**: Real-time stock tracking
- **Quality Control**: QC analysis tools and dashboards
- **Monitoring**: Grafana + Prometheus integration
- **Mobile-First**: Fully responsive design for tablets and smartphones

## 🚀 Quick Start

### Prerequisites

- WSL2 (Ubuntu 22.04+)
- Docker & Docker Compose
- For production: AWS account (optional)

### Local Development

```bash
# Clone the repository
git clone https://github.com/ytsutsumi30/grafana-setup.git
cd grafana-setup

# Start system
./manage.sh start

# Access system
open http://localhost
```

### AWS Deployment

```bash
# Deploy to AWS
cd terraform
terraform init
terraform apply

# Or use quick deploy
./aws-startup.sh full
```

## 📊 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla JavaScript (ES6+), Bootstrap 5, HTML5 |
| **Backend** | Node.js 18+, Express |
| **Database** | PostgreSQL 15 |
| **Monitoring** | Grafana, Prometheus |
| **Infrastructure** | Docker Compose, nginx, Terraform (AWS) |
| **QR Scanner** | BarcodeDetector API, jsQR, html5-qrcode |

## 🎯 Key Pages

| Page | URL | Description |
|------|-----|-------------|
| Main System | `/index.html` | Shipping inspection dashboard |
| QR Inspection | `/qr-inspection-v2.1.html` | QR-based inspection (latest) |
| Safari QR Scanner | `/safari.html` | iOS Safari-optimized scanner |
| Products | `/products.html` | Product master data |
| Inventory | `/inventory.html` | Inventory management |
| Shipping Instructions | `/shipping-instructions.html` | Shipping order management |

## 📁 Project Structure

```
grafana-setup/
├── web/                    # Frontend application
│   ├── index.html         # Main dashboard
│   ├── qr-inspection-v2.1.html  # QR inspection
│   ├── safari.html        # Mobile QR scanner
│   ├── js/                # JavaScript modules
│   └── css/               # Stylesheets
│
├── api/                   # Node.js API server
│   ├── server.js         # Main API (5,033 lines)
│   ├── routes/           # API routes
│   └── services/         # Business logic
│
├── terraform/            # AWS infrastructure
│   ├── main.tf
│   ├── modules/
│   └── terraform.tfvars.example
│
├── postgres/             # Database
│   └── init/            # Initialization scripts
│
├── nginx/                # Reverse proxy
│   └── conf.d/
│
├── docs/                 # Documentation
│   ├── QR_SCANNER_GUIDE.md
│   ├── QR_INSPECTION_GUIDE.md
│   ├── SAFARI_IOS_OPTIMIZATION.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── AWS_DEPLOYMENT_GUIDE.md
│   └── MOBILE_OPTIMIZATION.md
│
└── md/                   # Development logs & reports
```

## 🔧 Management Commands

### Using manage.sh

```bash
# Core operations
./manage.sh start      # Start main services
./manage.sh stop       # Stop services
./manage.sh restart    # Restart services
./manage.sh status     # Check service health
./manage.sh logs       # View logs

# Monitoring stack
./manage.sh monitoring start   # Start Grafana + Prometheus
./manage.sh monitoring stop    # Stop monitoring
./manage.sh monitoring status  # Check monitoring status

# Maintenance
./manage.sh backup     # Backup PostgreSQL database
./manage.sh clean      # Complete cleanup (removes all data)
```

## 📱 Mobile Support

The system is fully optimized for mobile devices:

- **iOS Safari**: Special optimizations for camera API and QR scanning
- **Device Modes**: iPad Mini and iPhone 6 optimized layouts
- **PWA**: Installable as a Progressive Web App
- **Touch Optimized**: 44px minimum touch targets
- **Responsive**: Works on screens from 375px to desktop

See [MOBILE_OPTIMIZATION.md](docs/MOBILE_OPTIMIZATION.md) for details.

## 📖 Documentation

### User Guides
- [QR Scanner Guide](docs/QR_SCANNER_GUIDE.md) - QR scanner architecture and optimization
- [QR Inspection Guide](docs/QR_INSPECTION_GUIDE.md) - Inspection system workflow
- [Mobile Optimization](docs/MOBILE_OPTIMIZATION.md) - Mobile features and device modes
- [Operations Manual](docs/OPERATIONS_MANUAL.md) - System usage instructions

### Technical Documentation
- [Safari/iOS Optimization](docs/SAFARI_IOS_OPTIMIZATION.md) - iOS-specific optimizations
- [Database Design](docs/DATABASE_DESIGN.md) - PostgreSQL schema
- [QR Inspection API Integration](docs/QR_INSPECTION_API_INTEGRATION.md) - API documentation
- [System Specification](md/SYSTEM_SPECIFICATION.md) - Complete system specs

### Deployment
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - General deployment guide
- [AWS Deployment Guide](docs/AWS_DEPLOYMENT_GUIDE.md) - AWS-specific deployment
- [Terraform README](terraform/README.md) - Infrastructure as Code

### Development
- [CLAUDE.md](CLAUDE.md) - Claude Code development guide
- [Source Files Inventory](md/SOURCE_FILES_INVENTORY.md) - Complete file listing
- [CHANGELOG.md](CHANGELOG.md) - Version history

## 🔐 Database

### Access PostgreSQL

```bash
docker-compose exec postgres psql -U production_user -d production_db
```

### Manual Backup/Restore

```bash
# Backup
docker-compose exec postgres pg_dump -U production_user production_db > backup.sql

# Restore
docker-compose exec -T postgres psql -U production_user -d production_db < backup.sql
```

## 🌐 Service URLs (Default)

| Service | URL | Credentials |
|---------|-----|-------------|
| Main System | http://localhost | - |
| QR Inspection | http://localhost/qr-inspection-v2.1.html | - |
| API | http://localhost/api/health | - |
| Grafana | http://localhost/grafana/ | admin/admin123 |
| Prometheus | http://localhost/prometheus/ | - |

## 💰 AWS Cost

When deployed to AWS with Terraform:

- **Monthly Cost**: $19-24 (with auto-scheduler)
- **POC Environment**: t3.micro instances
- **Auto-scheduler**: Weekday 9:00-19:00 JST

## 📈 Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

- **v2.1.1** (2025-10-18): Camera switching, deployment automation
- **v2.1** (2025-10-16): BFCache support, QrScanner library, enhanced calibration
- **v2.0** (2025-10-14): Device detection, QR inspection system rebuild
- **v1.0** (2025-10-01): Initial system release

## 🤝 Contributing

This is a production management system. For development:

1. Follow the patterns in `CLAUDE.md`
2. Test QR scanner on actual iOS devices
3. Maintain backwards compatibility
4. Update relevant documentation

## 📝 License

Internal use - Production Management System

---

## Source Files

This README consolidates:
- `doc/README.md` (327 lines)
- `doc/README2.md` (312 lines)
- `doc/README3.md` (1,066 lines)

**Total**: 1,705 lines consolidated

**Created**: 2025-11-23
