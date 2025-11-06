#!/bin/bash
#==============================================================================
# AWS 生産管理システム - 統合起動スクリプト
# Production Management System - AWS Unified Startup Script
#==============================================================================
# 
# このスクリプトは、AWS上で生産管理システムを稼働開始するための
# 包括的な機能を提供します。
#
# 主な機能:
#   - AWS インフラストラクチャの自動構築 (Terraform)
#   - EC2インスタンスへのアプリケーションデプロイ
#   - RDS PostgreSQL データベースの初期化
#   - SSL証明書の自動生成と設定
#   - システムの起動と停止
#   - ログ監視とヘルスチェック
#
# 使用方法:
#   ./aws-startup.sh deploy           # 新規デプロイ（インフラ構築+アプリ起動）
#   ./aws-startup.sh start            # システム起動（EC2+RDS）
#   ./aws-startup.sh stop             # システム停止
#   ./aws-startup.sh restart          # システム再起動
#   ./aws-startup.sh status           # ステータス確認
#   ./aws-startup.sh logs             # ログ表示
#   ./aws-startup.sh ssh              # SSH接続
#   ./aws-startup.sh destroy          # 全削除
#   ./aws-startup.sh health           # ヘルスチェック
#   ./aws-startup.sh backup           # データベースバックアップ
#
#==============================================================================

set -e

# ========================================
# 設定変数
# ========================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
TERRAFORM_DIR="$SCRIPT_DIR/terraform"
BACKUP_DIR="$SCRIPT_DIR/backups"

# カラー定義
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly MAGENTA='\033[0;35m'
readonly NC='\033[0m' # No Color

# ========================================
# ロギング関数
# ========================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
}

# ========================================
# 前提条件チェック
# ========================================
check_prerequisites() {
    log_header "前提条件チェック"
    
    local missing_deps=()
    
    # Terraform チェック
    if ! command -v terraform &> /dev/null; then
        missing_deps+=("terraform")
    else
        log_success "✓ Terraform: $(terraform version | head -n1)"
    fi
    
    # AWS CLI チェック
    if ! command -v aws &> /dev/null; then
        missing_deps+=("aws-cli")
    else
        log_success "✓ AWS CLI: $(aws --version 2>&1 | head -n1)"
    fi
    
    # Docker チェック（ローカル開発用）
    if command -v docker &> /dev/null; then
        log_success "✓ Docker: $(docker --version)"
    else
        log_warning "⚠ Docker not found (only required for local development)"
    fi
    
    # 欠損している依存関係のチェック
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        echo ""
        echo "Please install:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        exit 1
    fi
    
    # AWS認証情報チェック
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials are not configured"
        echo ""
        echo "Please run: aws configure"
        echo "  AWS Access Key ID: YOUR_ACCESS_KEY"
        echo "  AWS Secret Access Key: YOUR_SECRET_KEY"
        echo "  Default region: ap-northeast-1"
        echo "  Default output format: json"
        exit 1
    fi
    
    local aws_account=$(aws sts get-caller-identity --query Account --output text)
    local aws_region=$(aws configure get region || echo "us-east-1")
    log_success "✓ AWS Account: $aws_account"
    log_success "✓ AWS Region: $aws_region"
    
    log_success "All prerequisites met"
}

# ========================================
# Terraform出力取得ヘルパー
# ========================================
get_terraform_output() {
    local key=$1
    cd "$TERRAFORM_DIR"
    terraform output -raw "$key" 2>/dev/null || echo ""
}

get_ec2_ip() {
    get_terraform_output "ec2_public_ip"
}

get_ssh_key_path() {
    local key_name=$(get_terraform_output "ssh_command" | grep -oP '(?<=-i ~/\.ssh/)[^ ]+' || echo "")
    if [ -n "$key_name" ]; then
        echo "$HOME/.ssh/$key_name"
    else
        echo ""
    fi
}

# ========================================
# Terraformインフラ構築
# ========================================
deploy_infrastructure() {
    log_header "インフラストラクチャのデプロイ"
    
    cd "$TERRAFORM_DIR"
    
    # terraform.tfvars の確認
    if [ ! -f "terraform.tfvars" ]; then
        log_warning "terraform.tfvars が見つかりません"
        if [ -f "terraform.tfvars.example" ]; then
            log_info "terraform.tfvars.example からコピーしています..."
            cp terraform.tfvars.example terraform.tfvars
            log_warning "terraform.tfvars を編集してから再度実行してください"
            echo ""
            echo "必須項目:"
            echo "  - key_name: AWS EC2 Key Pair名"
            echo "  - db_password: データベースパスワード"
            echo "  - allowed_cidr_blocks: アクセス許可するIPアドレス"
            exit 0
        else
            log_error "terraform.tfvars.example が見つかりません"
            exit 1
        fi
    fi
    
    # Terraform初期化
    log_info "Terraform を初期化しています..."
    terraform init
    
    # プラン作成
    log_info "実行プランを作成しています..."
    terraform plan -out=tfplan
    
    # 確認
    echo ""
    read -p "このプランを適用しますか? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_warning "デプロイをキャンセルしました"
        rm -f tfplan
        exit 0
    fi
    
    # 適用
    log_info "インフラストラクチャを構築しています..."
    terraform apply tfplan
    rm -f tfplan
    
    log_success "インフラストラクチャのデプロイが完了しました"
}

# ========================================
# アプリケーションファイルのアップロード
# ========================================
upload_application() {
    log_header "アプリケーションのアップロード"
    
    local ec2_ip=$(get_ec2_ip)
    local key_path=$(get_ssh_key_path)
    
    if [ -z "$ec2_ip" ]; then
        log_error "EC2 IPアドレスが取得できません。先にインフラをデプロイしてください。"
        exit 1
    fi
    
    if [ ! -f "$key_path" ]; then
        log_error "SSH鍵が見つかりません: $key_path"
        exit 1
    fi
    
    log_info "EC2 IP: $ec2_ip"
    log_info "SSH鍵: $key_path"
    
    # SSH接続待機
    log_info "EC2インスタンスの準備を待機しています..."
    local max_retries=20
    local retry=0
    while [ $retry -lt $max_retries ]; do
        if ssh -i "$key_path" -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
            ec2-user@$ec2_ip "echo 'SSH connection successful'" &> /dev/null; then
            log_success "SSH接続が確立されました"
            break
        fi
        retry=$((retry + 1))
        log_info "リトライ $retry/$max_retries - SSH接続を待機中..."
        sleep 10
    done
    
    if [ $retry -eq $max_retries ]; then
        log_error "SSH接続に失敗しました"
        exit 1
    fi
    
    # リモートディレクトリ作成
    log_info "リモートディレクトリを作成しています..."
    ssh -i "$key_path" -o StrictHostKeyChecking=no ec2-user@$ec2_ip \
        "sudo mkdir -p /opt/production-management && sudo chown ec2-user:ec2-user /opt/production-management"
    
    # ファイルアップロード
    log_info "アプリケーションファイルをアップロードしています..."
    rsync -avz -e "ssh -i $key_path -o StrictHostKeyChecking=no" \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'terraform' \
        --exclude '*.log' \
        --exclude 'github-pages-qr-test' \
        --exclude 'ssl/server.key' \
        --exclude '.env' \
        --exclude '*.tfstate*' \
        --exclude '.terraform' \
        --exclude 'backups' \
        --exclude 'web-backup-*' \
        "$PROJECT_ROOT/" \
        ec2-user@$ec2_ip:/opt/production-management/
    
    log_success "アプリケーションファイルのアップロードが完了しました"
    
    # 環境変数ファイルの生成
    log_info "環境変数ファイルを生成しています..."
    local db_endpoint=$(get_terraform_output "rds_endpoint")
    local db_host=$(echo "$db_endpoint" | cut -d: -f1)
    
    ssh -i "$key_path" -o StrictHostKeyChecking=no ec2-user@$ec2_ip bash << ENVEOF
cd /opt/production-management

# Create .env file for API
mkdir -p api
cat > api/.env << 'DOTENV'
# Database Configuration (RDS)
DB_HOST=$db_host
DB_PORT=5432
DB_NAME=production_db
DB_USER=production_user
DB_PASSWORD=production_pass

# Application Configuration
NODE_ENV=production
API_PORT=3001

# Monitoring
GRAFANA_ADMIN_PASSWORD=admin123
PROMETHEUS_RETENTION=15d
DOTENV

chmod 600 api/.env
echo "✓ .env file created"
ENVEOF
    
    log_success "環境変数ファイルの生成が完了しました"
}

# ========================================
# SSL証明書のセットアップ
# ========================================
setup_ssl() {
    log_header "SSL証明書のセットアップ"
    
    local ec2_ip=$(get_ec2_ip)
    local key_path=$(get_ssh_key_path)
    
    if [ -z "$ec2_ip" ] || [ ! -f "$key_path" ]; then
        log_error "EC2情報が取得できません"
        exit 1
    fi
    
    log_info "SSL証明書を生成しています..."
    
    ssh -i "$key_path" -o StrictHostKeyChecking=no ec2-user@$ec2_ip bash << 'SSLEOF'
cd /opt/production-management

# SSL ディレクトリ作成
mkdir -p ssl

# EC2 パブリックIPを取得
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "Public IP: $PUBLIC_IP"

# OpenSSL設定ファイル作成
cat > ssl/openssl.cnf << CONFEOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = JP
ST = Tokyo
L = Tokyo
O = Production Management System
OU = QR Inspection
CN = $PUBLIC_IP

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.local
DNS.3 = *.compute.amazonaws.com
IP.1 = 127.0.0.1
IP.2 = $PUBLIC_IP
CONFEOF

# 自己署名証明書生成
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/server.key \
    -out ssl/server.crt \
    -config ssl/openssl.cnf 2>/dev/null

# パーミッション設定
chmod 600 ssl/server.key
chmod 644 ssl/server.crt

echo "✓ SSL certificate generated for $PUBLIC_IP"

# Nginx設定にIPアドレスを反映
if [ -f nginx/conf.d/default.conf ]; then
    sed -i "s/server_name .*/server_name $PUBLIC_IP localhost;/g" nginx/conf.d/default.conf
    echo "✓ Nginx configuration updated"
fi
SSLEOF
    
    log_success "SSL証明書のセットアップが完了しました"
}

# ========================================
# データベース初期化
# ========================================
init_database() {
    log_header "データベースの初期化"
    
    local ec2_ip=$(get_ec2_ip)
    local key_path=$(get_ssh_key_path)
    
    if [ -z "$ec2_ip" ] || [ ! -f "$key_path" ]; then
        log_error "EC2情報が取得できません"
        exit 1
    fi
    
    log_info "データベースを初期化しています..."
    
    ssh -i "$key_path" -o StrictHostKeyChecking=no ec2-user@$ec2_ip bash << 'DBEOF'
cd /opt/production-management

# 環境変数読み込み
if [ -f api/.env ]; then
    export $(grep -v '^#' api/.env | xargs)
else
    echo "Error: api/.env not found"
    exit 1
fi

# RDS の可用性を待機
echo "Waiting for RDS to be available..."
max_retries=30
retry=0
while [ $retry -lt $max_retries ]; do
    if docker run --rm -e PGPASSWORD=$DB_PASSWORD postgres:15-alpine \
        psql -h $DB_HOST -U $DB_USER -d postgres -c "SELECT 1" &> /dev/null; then
        echo "✓ RDS is available"
        break
    fi
    retry=$((retry + 1))
    echo "Retry $retry/$max_retries..."
    sleep 10
done

if [ $retry -eq $max_retries ]; then
    echo "Error: RDS connection timeout"
    exit 1
fi

# データベース初期化スクリプトの実行
if [ -d postgres/init ]; then
    echo "Running database initialization scripts..."
    for sql_file in postgres/init/*.sql; do
        if [ -f "$sql_file" ]; then
            echo "Executing: $(basename $sql_file)"
            docker run --rm -i -e PGPASSWORD=$DB_PASSWORD postgres:15-alpine \
                psql -h $DB_HOST -U $DB_USER -d $DB_NAME < "$sql_file" 2>&1 | head -20
        fi
    done
    echo "✓ Database initialized successfully"
else
    echo "Warning: postgres/init directory not found"
fi
DBEOF
    
    log_success "データベースの初期化が完了しました"
}

# ========================================
# アプリケーション起動
# ========================================
start_application() {
    log_header "アプリケーションの起動"
    
    local ec2_ip=$(get_ec2_ip)
    local key_path=$(get_ssh_key_path)
    
    if [ -z "$ec2_ip" ] || [ ! -f "$key_path" ]; then
        log_error "EC2情報が取得できません"
        exit 1
    fi
    
    log_info "Docker Composeでアプリケーションを起動しています..."
    
    ssh -i "$key_path" -o StrictHostKeyChecking=no ec2-user@$ec2_ip bash << 'STARTEOF'
cd /opt/production-management

# Docker Composeコマンドの判定
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "Error: docker-compose not found"
    exit 1
fi

# 既存コンテナの停止
echo "Stopping existing containers..."
$COMPOSE_CMD down 2>/dev/null || true

# Dockerイメージのプル
echo "Pulling Docker images..."
$COMPOSE_CMD pull

# コンテナ起動
echo "Starting containers..."
$COMPOSE_CMD up -d

# 起動待機
echo "Waiting for containers to be ready..."
sleep 20

# コンテナステータス確認
echo ""
echo "Container status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# ヘルスチェック
echo ""
echo "Checking application health..."
max_retries=15
retry=0
while [ $retry -lt $max_retries ]; do
    http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
    if [[ "$http_code" =~ ^(200|301|302)$ ]]; then
        echo "✓ Application is responding (HTTP $http_code)"
        break
    fi
    retry=$((retry + 1))
    echo "Retry $retry/$max_retries - waiting for application (HTTP $http_code)..."
    sleep 5
done

if [ $retry -eq $max_retries ]; then
    echo "Warning: Application health check timed out"
fi

# ログ表示
echo ""
echo "Recent logs:"
$COMPOSE_CMD logs --tail=30
STARTEOF
    
    log_success "アプリケーションの起動が完了しました"
}

# ========================================
# EC2/RDS起動（既存インフラ）
# ========================================
start_instances() {
    log_header "AWSインスタンスの起動"
    
    cd "$TERRAFORM_DIR"
    
    local ec2_instance_id=$(terraform output -raw ec2_instance_id 2>/dev/null || echo "")
    local rds_instance_id=$(terraform output -raw rds_instance_id 2>/dev/null || echo "")
    
    if [ -z "$ec2_instance_id" ]; then
        log_error "EC2インスタンスIDが取得できません"
        exit 1
    fi
    
    # EC2起動
    log_info "EC2インスタンスを起動しています..."
    aws ec2 start-instances --instance-ids "$ec2_instance_id" > /dev/null
    
    # RDS起動（存在する場合）
    if [ -n "$rds_instance_id" ]; then
        log_info "RDSインスタンスを起動しています..."
        aws rds start-db-instance --db-instance-identifier "$rds_instance_id" > /dev/null 2>&1 || \
            log_warning "RDS is already running or cannot be started"
    fi
    
    # 起動待機
    log_info "インスタンスの起動を待機しています..."
    aws ec2 wait instance-running --instance-ids "$ec2_instance_id"
    
    log_success "AWSインスタンスが起動しました"
    
    # アプリケーション起動
    sleep 10
    start_application
}

# ========================================
# EC2/RDS停止
# ========================================
stop_instances() {
    log_header "AWSインスタンスの停止"
    
    cd "$TERRAFORM_DIR"
    
    local ec2_instance_id=$(terraform output -raw ec2_instance_id 2>/dev/null || echo "")
    local rds_instance_id=$(terraform output -raw rds_instance_id 2>/dev/null || echo "")
    
    if [ -z "$ec2_instance_id" ]; then
        log_error "EC2インスタンスIDが取得できません"
        exit 1
    fi
    
    # EC2停止
    log_info "EC2インスタンスを停止しています..."
    aws ec2 stop-instances --instance-ids "$ec2_instance_id" > /dev/null
    
    # RDS停止（存在する場合）
    if [ -n "$rds_instance_id" ]; then
        log_info "RDSインスタンスを停止しています..."
        aws rds stop-db-instance --db-instance-identifier "$rds_instance_id" > /dev/null 2>&1 || \
            log_warning "RDS is already stopped or cannot be stopped"
    fi
    
    # 停止待機
    log_info "インスタンスの停止を待機しています..."
    aws ec2 wait instance-stopped --instance-ids "$ec2_instance_id"
    
    log_success "AWSインスタンスが停止しました"
}

# ========================================
# ステータス確認
# ========================================
check_status() {
    log_header "システムステータス"
    
    cd "$TERRAFORM_DIR"
    
    local ec2_instance_id=$(terraform output -raw ec2_instance_id 2>/dev/null || echo "")
    local ec2_ip=$(get_ec2_ip)
    local rds_instance_id=$(terraform output -raw rds_instance_id 2>/dev/null || echo "")
    
    if [ -z "$ec2_instance_id" ]; then
        log_warning "インフラがデプロイされていません"
        echo "実行: ./aws-startup.sh deploy"
        return
    fi
    
    # EC2ステータス
    echo ""
    echo "📊 EC2 Instance:"
    local ec2_state=$(aws ec2 describe-instances \
        --instance-ids "$ec2_instance_id" \
        --query 'Reservations[0].Instances[0].State.Name' \
        --output text 2>/dev/null || echo "unknown")
    
    if [ "$ec2_state" = "running" ]; then
        echo -e "  ${GREEN}● running${NC}"
        echo "  IP: $ec2_ip"
    elif [ "$ec2_state" = "stopped" ]; then
        echo -e "  ${YELLOW}● stopped${NC}"
    else
        echo -e "  ${RED}● $ec2_state${NC}"
    fi
    
    # RDSステータス
    if [ -n "$rds_instance_id" ]; then
        echo ""
        echo "📊 RDS Instance:"
        local rds_state=$(aws rds describe-db-instances \
            --db-instance-identifier "$rds_instance_id" \
            --query 'DBInstances[0].DBInstanceStatus' \
            --output text 2>/dev/null || echo "unknown")
        
        if [ "$rds_state" = "available" ]; then
            echo -e "  ${GREEN}● available${NC}"
        elif [ "$rds_state" = "stopped" ]; then
            echo -e "  ${YELLOW}● stopped${NC}"
        else
            echo -e "  ${CYAN}● $rds_state${NC}"
        fi
    fi
    
    # アプリケーションヘルスチェック
    if [ "$ec2_state" = "running" ] && [ -n "$ec2_ip" ]; then
        echo ""
        echo "🌐 Application Health:"
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://$ec2_ip" 2>/dev/null || echo "000")
        if [[ "$http_code" =~ ^(200|301|302)$ ]]; then
            echo -e "  ${GREEN}● Healthy${NC} (HTTP $http_code)"
            echo "  URL: http://$ec2_ip"
        else
            echo -e "  ${RED}● Unhealthy${NC} (HTTP $http_code)"
        fi
    fi
    
    echo ""
}

# ========================================
# ログ表示
# ========================================
show_logs() {
    log_header "システムログ"
    
    local ec2_ip=$(get_ec2_ip)
    local key_path=$(get_ssh_key_path)
    
    if [ -z "$ec2_ip" ] || [ ! -f "$key_path" ]; then
        log_error "EC2情報が取得できません"
        exit 1
    fi
    
    log_info "リアルタイムログを表示しています (Ctrl+Cで終了)..."
    
    ssh -i "$key_path" -o StrictHostKeyChecking=no ec2-user@$ec2_ip \
        "cd /opt/production-management && docker-compose logs -f --tail=100"
}

# ========================================
# SSH接続
# ========================================
connect_ssh() {
    local ec2_ip=$(get_ec2_ip)
    local key_path=$(get_ssh_key_path)
    
    if [ -z "$ec2_ip" ] || [ ! -f "$key_path" ]; then
        log_error "EC2情報が取得できません"
        exit 1
    fi
    
    log_info "SSH接続しています: $ec2_ip"
    ssh -i "$key_path" -o StrictHostKeyChecking=no ec2-user@$ec2_ip
}

# ========================================
# ヘルスチェック
# ========================================
health_check() {
    log_header "ヘルスチェック"
    
    local ec2_ip=$(get_ec2_ip)
    local key_path=$(get_ssh_key_path)
    
    if [ -z "$ec2_ip" ] || [ ! -f "$key_path" ]; then
        log_error "EC2情報が取得できません"
        exit 1
    fi
    
    # HTTP チェック
    echo "🌐 HTTP Health Check:"
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://$ec2_ip" 2>/dev/null || echo "000")
    if [[ "$http_code" =~ ^(200|301|302)$ ]]; then
        echo -e "  ${GREEN}✓ HTTP: $http_code${NC}"
    else
        echo -e "  ${RED}✗ HTTP: $http_code${NC}"
    fi
    
    # HTTPS チェック
    local https_code=$(curl -k -s -o /dev/null -w "%{http_code}" "https://$ec2_ip" 2>/dev/null || echo "000")
    if [[ "$https_code" =~ ^(200|301|302)$ ]]; then
        echo -e "  ${GREEN}✓ HTTPS: $https_code${NC}"
    else
        echo -e "  ${YELLOW}⚠ HTTPS: $https_code${NC}"
    fi
    
    # API ヘルスチェック
    echo ""
    echo "🔧 API Health Check:"
    local api_code=$(curl -s -o /dev/null -w "%{http_code}" "http://$ec2_ip/api/health" 2>/dev/null || echo "000")
    if [ "$api_code" = "200" ]; then
        echo -e "  ${GREEN}✓ API Health: 200${NC}"
    else
        echo -e "  ${RED}✗ API Health: $api_code${NC}"
    fi
    
    # Docker コンテナステータス
    echo ""
    echo "🐳 Docker Containers:"
    ssh -i "$key_path" -o StrictHostKeyChecking=no ec2-user@$ec2_ip \
        "docker ps --format 'table {{.Names}}\t{{.Status}}' 2>/dev/null" || \
        echo "  Unable to retrieve container status"
    
    echo ""
}

# ========================================
# データベースバックアップ
# ========================================
backup_database() {
    log_header "データベースバックアップ"
    
    cd "$TERRAFORM_DIR"
    local rds_instance_id=$(terraform output -raw rds_instance_id 2>/dev/null || echo "")
    
    if [ -z "$rds_instance_id" ]; then
        log_error "RDSインスタンスIDが取得できません"
        exit 1
    fi
    
    local snapshot_id="manual-backup-$(date +%Y%m%d-%H%M%S)"
    
    log_info "スナップショットを作成しています: $snapshot_id"
    aws rds create-db-snapshot \
        --db-instance-identifier "$rds_instance_id" \
        --db-snapshot-identifier "$snapshot_id"
    
    log_info "スナップショット作成中... (完了まで数分かかります)"
    log_success "スナップショットID: $snapshot_id"
    
    echo ""
    echo "確認コマンド:"
    echo "  aws rds describe-db-snapshots --db-snapshot-identifier $snapshot_id"
}

# ========================================
# インフラ削除
# ========================================
destroy_infrastructure() {
    log_header "インフラストラクチャの削除"
    
    cd "$TERRAFORM_DIR"
    
    log_warning "すべてのAWSリソースが削除されます！"
    echo ""
    read -p "本当に削除しますか? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "削除をキャンセルしました"
        exit 0
    fi
    
    log_info "Terraformでリソースを削除しています..."
    terraform destroy -auto-approve
    
    log_success "インフラストラクチャが削除されました"
}

# ========================================
# 出力情報表示
# ========================================
show_outputs() {
    log_header "デプロイ情報"
    
    cd "$TERRAFORM_DIR"
    
    local ec2_ip=$(get_ec2_ip)
    
    echo ""
    echo "🌐 アクセス URL:"
    echo "  HTTP:         http://$ec2_ip"
    echo "  HTTPS:        https://$ec2_ip"
    echo "  QR検品:       http://$ec2_ip/qr-inspection.html"
    echo "  出荷検品:     http://$ec2_ip/shipping-inspection-mockup.html"
    echo ""
    echo "🔑 SSH接続:"
    echo "  $(get_terraform_output ssh_command 2>/dev/null || echo 'Not available')"
    echo ""
    echo "💰 コスト見積:"
    get_terraform_output monthly_cost_estimate 2>/dev/null || echo "  Not available"
    echo ""
    
    log_info "詳細情報: cd terraform && terraform output"
}

# ========================================
# フルデプロイ（初回セットアップ）
# ========================================
full_deploy() {
    log_header "フルデプロイメント開始"
    
    check_prerequisites
    deploy_infrastructure
    
    echo ""
    read -p "アプリケーションをデプロイして起動しますか? (yes/no): " deploy_app
    if [ "$deploy_app" = "yes" ]; then
        upload_application
        setup_ssl
        init_database
        start_application
        show_outputs
    else
        log_info "インフラのみデプロイしました"
        show_outputs
    fi
    
    log_success "デプロイメントが完了しました！"
}

# ========================================
# ヘルプ表示
# ========================================
show_help() {
    cat << 'HELPEOF'
AWS 生産管理システム - 統合起動スクリプト
Production Management System - AWS Unified Startup Script

使用方法:
  ./aws-startup.sh <コマンド>

コマンド:
  deploy          新規デプロイ（インフラ構築 + アプリケーション起動）
  start           システム起動（EC2 + RDS）
  stop            システム停止
  restart         システム再起動
  status          ステータス確認
  logs            ログ表示（リアルタイム）
  ssh             SSH接続
  health          ヘルスチェック
  backup          データベースバックアップ（RDSスナップショット）
  destroy         全リソース削除
  outputs         デプロイ情報表示
  help            このヘルプを表示

例:
  # 初回セットアップ
  ./aws-startup.sh deploy

  # 日次運用
  ./aws-startup.sh start     # 朝：起動
  ./aws-startup.sh status    # ステータス確認
  ./aws-startup.sh logs      # ログ確認
  ./aws-startup.sh stop      # 夜：停止

  # トラブルシューティング
  ./aws-startup.sh health    # ヘルスチェック
  ./aws-startup.sh ssh       # SSH接続して調査

前提条件:
  - Terraform がインストールされていること
  - AWS CLI がインストール・設定されていること
  - EC2用のSSH鍵ペアが作成されていること
  - terraform/terraform.tfvars が設定されていること

詳細:
  terraform/README.md を参照してください

HELPEOF
}

# ========================================
# メイン処理
# ========================================
main() {
    local command=${1:-help}
    
    case "$command" in
        deploy)
            full_deploy
            ;;
        start)
            check_prerequisites
            start_instances
            ;;
        stop)
            check_prerequisites
            stop_instances
            ;;
        restart)
            check_prerequisites
            stop_instances
            sleep 5
            start_instances
            ;;
        status)
            check_prerequisites
            check_status
            ;;
        logs)
            check_prerequisites
            show_logs
            ;;
        ssh)
            check_prerequisites
            connect_ssh
            ;;
        health)
            check_prerequisites
            health_check
            ;;
        backup)
            check_prerequisites
            backup_database
            ;;
        destroy)
            check_prerequisites
            destroy_infrastructure
            ;;
        outputs)
            check_prerequisites
            show_outputs
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "不明なコマンド: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"
