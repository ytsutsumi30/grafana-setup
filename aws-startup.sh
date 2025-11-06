#!/bin/bash
# ========================================
# AWS Production Management System - Startup Script
# AWS上で生産管理システムを稼働開始するための統合スクリプト
# ========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
TERRAFORM_DIR="$SCRIPT_DIR/terraform"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
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

log_step() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
}

# ========================================
# Usage
# ========================================
usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

AWS生産管理システム稼働開始スクリプト

COMMANDS:
    check           前提条件のチェック
    setup           初回セットアップ（Terraform初期化）
    deploy          インフラのデプロイ
    start           アプリケーションの起動
    full            フルデプロイ（setup + deploy + start）
    status          システム状態の確認
    stop            システムの停止
    restart         システムの再起動
    logs            ログの表示
    ssh             EC2にSSH接続
    destroy         全リソースの削除
    help            このヘルプを表示

OPTIONS:
    --skip-confirm  確認プロンプトをスキップ
    --monitoring    監視システムも起動

EXAMPLES:
    # 初回デプロイ
    $0 full

    # システム起動のみ
    $0 start

    # 監視システムも含めて起動
    $0 start --monitoring

    # システム停止
    $0 stop

    # ステータス確認
    $0 status

    # EC2にSSH接続
    $0 ssh

    # 全削除
    $0 destroy

EOF
}

# ========================================
# Parse Arguments
# ========================================
COMMAND="${1:-help}"
SKIP_CONFIRM=false
WITH_MONITORING=false

shift || true
while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-confirm)
            SKIP_CONFIRM=true
            shift
            ;;
        --monitoring)
            WITH_MONITORING=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# ========================================
# Check Prerequisites
# ========================================
check_prerequisites() {
    log_step "前提条件のチェック"

    local all_ok=true

    # Check Terraform
    if command -v terraform &> /dev/null; then
        local tf_version=$(terraform version -json | grep -o '"terraform_version":"[^"]*' | cut -d'"' -f4)
        log_success "Terraform: インストール済み (v${tf_version})"
    else
        log_error "Terraform: インストールされていません"
        echo "  インストール方法: https://www.terraform.io/downloads"
        all_ok=false
    fi

    # Check AWS CLI
    if command -v aws &> /dev/null; then
        local aws_version=$(aws --version | awk '{print $1}')
        log_success "AWS CLI: インストール済み (${aws_version})"
        
        # Check AWS credentials
        if aws sts get-caller-identity &> /dev/null; then
            local aws_account=$(aws sts get-caller-identity --query Account --output text)
            local aws_region=$(aws configure get region || echo "未設定")
            log_success "AWS認証: 設定済み (Account: ${aws_account}, Region: ${aws_region})"
        else
            log_error "AWS認証: 設定されていません"
            echo "  設定方法: aws configure"
            all_ok=false
        fi
    else
        log_error "AWS CLI: インストールされていません"
        echo "  インストール方法: https://aws.amazon.com/cli/"
        all_ok=false
    fi

    # Check Docker (optional, for local testing)
    if command -v docker &> /dev/null; then
        log_success "Docker: インストール済み"
    else
        log_warning "Docker: インストールされていません（AWS環境では不要）"
    fi

    # Check SSH key
    if [ -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
        local key_name=$(grep '^key_name' "$TERRAFORM_DIR/terraform.tfvars" | awk -F'"' '{print $2}')
        if [ -n "$key_name" ] && [ -f "$HOME/.ssh/${key_name}.pem" ]; then
            log_success "SSH Key: 設定済み ($key_name)"
        else
            log_warning "SSH Key: 設定を確認してください"
        fi
    fi

    echo ""
    if [ "$all_ok" = true ]; then
        log_success "✅ すべての前提条件を満たしています"
        return 0
    else
        log_error "❌ 前提条件が不足しています"
        return 1
    fi
}

# ========================================
# Setup Terraform
# ========================================
setup_terraform() {
    log_step "Terraform初期セットアップ"

    cd "$TERRAFORM_DIR"

    # Check if terraform.tfvars exists
    if [ ! -f "terraform.tfvars" ]; then
        log_warning "terraform.tfvarsが見つかりません。サンプルから作成します..."
        cp terraform.tfvars.example terraform.tfvars
        
        echo ""
        log_warning "⚠️  terraform.tfvarsを編集してください："
        echo "  1. key_name: AWS SSH Key Pair名"
        echo "  2. db_password: データベースパスワード（強力なもの）"
        echo "  3. allowed_cidr_blocks: アクセス元IPアドレス制限"
        echo ""
        echo "編集コマンド: vim $TERRAFORM_DIR/terraform.tfvars"
        echo ""
        
        if [ "$SKIP_CONFIRM" = false ]; then
            read -p "terraform.tfvarsを編集しましたか? (yes/no): " confirm
            if [ "$confirm" != "yes" ]; then
                log_info "terraform.tfvarsを編集後、再度このスクリプトを実行してください"
                exit 0
            fi
        fi
    else
        log_success "terraform.tfvars: 設定済み"
    fi

    # Initialize Terraform
    log_info "Terraformを初期化しています..."
    terraform init
    
    log_success "✅ Terraform初期化完了"
}

# ========================================
# Deploy Infrastructure
# ========================================
deploy_infrastructure() {
    log_step "AWSインフラストラクチャのデプロイ"

    cd "$TERRAFORM_DIR"

    # Validate configuration
    log_info "Terraform設定を検証しています..."
    terraform validate
    
    # Plan
    log_info "デプロイプランを作成しています..."
    terraform plan -out=tfplan
    
    echo ""
    log_info "📋 デプロイ内容を確認してください"
    
    if [ "$SKIP_CONFIRM" = false ]; then
        read -p "このプランを適用しますか? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log_warning "デプロイをキャンセルしました"
            rm -f tfplan
            exit 0
        fi
    fi
    
    # Apply
    log_info "インフラストラクチャをデプロイしています..."
    log_warning "⏳ 完了まで約10-15分かかります..."
    
    terraform apply tfplan
    rm -f tfplan
    
    log_success "✅ インフラストラクチャのデプロイ完了"
}

# ========================================
# Get EC2 Information
# ========================================
get_ec2_info() {
    cd "$TERRAFORM_DIR"
    
    EC2_IP=$(terraform output -raw ec2_public_ip 2>/dev/null || echo "")
    EC2_ID=$(terraform output -raw ec2_instance_id 2>/dev/null || echo "")
    SSH_KEY=$(terraform output -raw ssh_command 2>/dev/null | grep -oP '(?<=-i ~/\.ssh/)[^ ]+' | sed 's/\.pem//' || echo "")
    SSH_KEY_PATH="$HOME/.ssh/${SSH_KEY}.pem"
    
    if [ -z "$EC2_IP" ]; then
        log_error "EC2情報を取得できません。まずデプロイを実行してください: $0 deploy"
        exit 1
    fi
}

# ========================================
# Upload Application Files
# ========================================
upload_application() {
    log_step "アプリケーションファイルのアップロード"
    
    get_ec2_info
    
    log_info "EC2 IP: $EC2_IP"
    log_info "SSH Key: $SSH_KEY"
    
    # Wait for EC2 to be ready
    log_info "EC2の起動を待機しています..."
    sleep 30
    
    # Test SSH connection
    log_info "SSH接続をテストしています..."
    local max_retries=20
    local retry=0
    while [ $retry -lt $max_retries ]; do
        if ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no -o ConnectTimeout=10 ec2-user@$EC2_IP "echo 'SSH OK'" &> /dev/null; then
            log_success "SSH接続確立"
            break
        fi
        retry=$((retry + 1))
        log_warning "再試行 $retry/$max_retries - SSH接続待機中..."
        sleep 10
    done
    
    if [ $retry -eq $max_retries ]; then
        log_error "SSH接続に失敗しました"
        exit 1
    fi
    
    # Create remote directory
    log_info "リモートディレクトリを作成しています..."
    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no ec2-user@$EC2_IP \
        "sudo mkdir -p /opt/production-management && sudo chown ec2-user:ec2-user /opt/production-management"
    
    # Upload application files
    log_info "アプリケーションファイルをアップロードしています..."
    log_warning "⏳ ファイルサイズによっては数分かかります..."
    
    rsync -avz --progress -e "ssh -i $SSH_KEY_PATH -o StrictHostKeyChecking=no" \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'terraform' \
        --exclude '*.log' \
        --exclude 'github-pages-qr-test' \
        --exclude 'ssl/server.key' \
        --exclude '.env' \
        --exclude '*.tfstate*' \
        --exclude '.terraform' \
        --exclude 'web-backup-*' \
        "$PROJECT_ROOT/" \
        ec2-user@$EC2_IP:/opt/production-management/
    
    log_success "✅ アプリケーションファイルのアップロード完了"
}

# ========================================
# Configure Application
# ========================================
configure_application() {
    log_step "アプリケーション設定"
    
    get_ec2_info
    
    cd "$TERRAFORM_DIR"
    local db_endpoint=$(terraform output -raw rds_endpoint 2>/dev/null || echo "")
    local db_host=$(echo "$db_endpoint" | cut -d: -f1)
    
    log_info "データベース設定を構成しています..."
    
    # Generate .env file
    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no ec2-user@$EC2_IP << EOF
cd /opt/production-management

# Create .env file for API
cat > api/.env << 'DOTENV'
# Database Configuration (RDS)
DB_HOST=${db_host}
DB_PORT=5432
DB_NAME=production_db
DB_USER=production_user
DB_PASSWORD=production_pass

# Application Configuration
NODE_ENV=production
API_PORT=3000

# Logging
LOG_LEVEL=info
DOTENV

chmod 600 api/.env

echo "✅ .env ファイル作成完了"
EOF
    
    # Setup SSL certificate
    log_info "SSL証明書を生成しています..."
    
    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no ec2-user@$EC2_IP << 'EOF'
cd /opt/production-management

# Create ssl directory
mkdir -p ssl

# Get EC2 public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

# Create OpenSSL configuration
cat > ssl/openssl.cnf << SSLCONF
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
DNS.2 = *.compute.amazonaws.com
IP.1 = 127.0.0.1
IP.2 = $PUBLIC_IP
SSLCONF

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/server.key \
    -out ssl/server.crt \
    -config ssl/openssl.cnf 2>/dev/null

chmod 600 ssl/server.key
chmod 644 ssl/server.crt

echo "✅ SSL証明書生成完了: $PUBLIC_IP"
EOF
    
    log_success "✅ アプリケーション設定完了"
}

# ========================================
# Initialize Database
# ========================================
initialize_database() {
    log_step "データベース初期化"
    
    get_ec2_info
    
    log_info "データベーススキーマを初期化しています..."
    log_warning "⏳ RDSの準備に数分かかる場合があります..."
    
    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no ec2-user@$EC2_IP << 'EOF'
cd /opt/production-management

# Load environment variables
export $(grep -v '^#' api/.env | xargs)

# Wait for RDS to be available
echo "⏳ RDS接続待機中..."
max_retries=30
retry=0
while [ $retry -lt $max_retries ]; do
    if docker run --rm -e PGPASSWORD=$DB_PASSWORD postgres:15-alpine \
        psql -h $DB_HOST -U $DB_USER -d postgres -c "SELECT 1" &> /dev/null; then
        echo "✅ RDS接続成功"
        break
    fi
    retry=$((retry + 1))
    echo "再試行 $retry/$max_retries..."
    sleep 10
done

if [ $retry -eq $max_retries ]; then
    echo "❌ RDS接続タイムアウト"
    exit 1
fi

# Initialize database schemas
echo "📊 データベーススキーマを初期化しています..."

if [ -d postgres/init ]; then
    for sql_file in postgres/init/*.sql; do
        if [ -f "$sql_file" ]; then
            echo "実行中: $(basename $sql_file)"
            docker run --rm -i -e PGPASSWORD=$DB_PASSWORD postgres:15-alpine \
                psql -h $DB_HOST -U $DB_USER -d $DB_NAME < "$sql_file" 2>&1 | grep -v "already exists" || true
        fi
    done
    echo "✅ データベーススキーマ初期化完了"
else
    echo "⚠️  postgres/initディレクトリが見つかりません"
fi
EOF
    
    log_success "✅ データベース初期化完了"
}

# ========================================
# Start Application
# ========================================
start_application() {
    log_step "アプリケーション起動"
    
    get_ec2_info
    
    log_info "Dockerコンテナを起動しています..."
    
    local monitoring_flag=""
    if [ "$WITH_MONITORING" = true ]; then
        monitoring_flag="--profile monitoring"
        log_info "監視システムも起動します（Grafana + Prometheus）"
    fi
    
    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no ec2-user@$EC2_IP << EOF
cd /opt/production-management

# Determine docker-compose command
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ docker-composeが見つかりません"
    exit 1
fi

# Stop existing containers
echo "既存のコンテナを停止しています..."
\$COMPOSE_CMD down 2>/dev/null || true

# Pull images
echo "Dockerイメージをpullしています..."
\$COMPOSE_CMD pull

# Start containers
echo "コンテナを起動しています..."
\$COMPOSE_CMD up -d ${monitoring_flag}

# Wait for services
echo "⏳ サービス起動待機中..."
sleep 20

# Check container status
echo ""
echo "📋 コンテナ状態:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check application health
echo ""
echo "🏥 アプリケーションヘルスチェック..."
max_retries=15
retry=0
while [ \$retry -lt \$max_retries ]; do
    http_code=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost || echo "000")
    if echo "\$http_code" | grep -qE "200|301|302"; then
        echo "✅ アプリケーションは正常に応答しています (HTTP \$http_code)"
        break
    fi
    retry=\$((retry + 1))
    echo "再試行 \$retry/\$max_retries - 待機中..."
    sleep 5
done

if [ \$retry -eq \$max_retries ]; then
    echo "⚠️  アプリケーションの応答確認に失敗しました"
    echo "ログを確認してください: docker-compose logs"
fi

# Show recent logs
echo ""
echo "📋 最新のログ:"
\$COMPOSE_CMD logs --tail=30
EOF
    
    log_success "✅ アプリケーション起動完了"
}

# ========================================
# Show Status
# ========================================
show_status() {
    log_step "システム状態確認"
    
    cd "$TERRAFORM_DIR"
    
    if [ ! -f "terraform.tfstate" ]; then
        log_warning "Terraformの状態が見つかりません。まずデプロイを実行してください。"
        return
    fi
    
    get_ec2_info
    
    # AWS Resources Status
    echo ""
    echo "🌐 AWS リソース状態:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # EC2 Status
    local ec2_state=$(aws ec2 describe-instances --instance-ids "$EC2_ID" --query 'Reservations[0].Instances[0].State.Name' --output text 2>/dev/null || echo "不明")
    echo "EC2 Instance: $ec2_state"
    echo "  - Instance ID: $EC2_ID"
    echo "  - Public IP: $EC2_IP"
    
    # RDS Status
    local rds_id=$(terraform output -raw rds_instance_id 2>/dev/null || echo "")
    if [ -n "$rds_id" ]; then
        local rds_status=$(aws rds describe-db-instances --db-instance-identifier "$rds_id" --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "不明")
        echo "RDS Database: $rds_status"
        echo "  - Instance ID: $rds_id"
    fi
    
    # Application URLs
    echo ""
    echo "🔗 アクセスURL:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "HTTP:  http://$EC2_IP"
    echo "HTTPS: https://$EC2_IP"
    echo "API:   http://$EC2_IP/api/health"
    
    # Application Status (if EC2 is running)
    if [ "$ec2_state" = "running" ]; then
        echo ""
        echo "📦 Docker コンテナ状態:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no -o ConnectTimeout=5 ec2-user@$EC2_IP \
            "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" 2>/dev/null || \
            echo "⚠️  EC2に接続できませんでした"
    fi
    
    # Cost Estimate
    echo ""
    echo "💰 月額コスト見積もり:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    terraform output -raw monthly_cost_estimate 2>/dev/null || echo "見積もり情報なし"
    
    echo ""
}

# ========================================
# Stop System
# ========================================
stop_system() {
    log_step "システム停止"
    
    get_ec2_info
    
    if [ "$SKIP_CONFIRM" = false ]; then
        echo ""
        read -p "システムを停止しますか? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log_warning "停止をキャンセルしました"
            return
        fi
    fi
    
    log_info "Dockerコンテナを停止しています..."
    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no ec2-user@$EC2_IP \
        "cd /opt/production-management && docker-compose down" 2>/dev/null || true
    
    log_info "EC2インスタンスを停止しています..."
    aws ec2 stop-instances --instance-ids "$EC2_ID" > /dev/null
    
    log_info "RDSインスタンスを停止しています..."
    cd "$TERRAFORM_DIR"
    local rds_id=$(terraform output -raw rds_instance_id 2>/dev/null || echo "")
    if [ -n "$rds_id" ]; then
        aws rds stop-db-instance --db-instance-identifier "$rds_id" > /dev/null 2>&1 || \
            log_warning "RDSは既に停止しているか、停止できません"
    fi
    
    log_success "✅ システム停止完了"
    log_info "💡 起動する場合: $0 start"
}

# ========================================
# Restart System
# ========================================
restart_system() {
    log_step "システム再起動"
    
    get_ec2_info
    
    log_info "EC2インスタンスを再起動しています..."
    aws ec2 reboot-instances --instance-ids "$EC2_ID"
    
    log_info "⏳ EC2の再起動待機中（約60秒）..."
    sleep 60
    
    log_info "アプリケーションを起動しています..."
    start_application
    
    log_success "✅ システム再起動完了"
}

# ========================================
# Show Logs
# ========================================
show_logs() {
    log_step "ログ表示"
    
    get_ec2_info
    
    log_info "アプリケーションログを取得しています..."
    
    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no ec2-user@$EC2_IP \
        "cd /opt/production-management && docker-compose logs --tail=100 -f"
}

# ========================================
# SSH Connect
# ========================================
ssh_connect() {
    log_step "EC2にSSH接続"
    
    get_ec2_info
    
    log_info "SSH接続中: ec2-user@$EC2_IP"
    log_info "作業ディレクトリ: /opt/production-management"
    echo ""
    
    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no ec2-user@$EC2_IP
}

# ========================================
# Destroy Infrastructure
# ========================================
destroy_infrastructure() {
    log_step "インフラストラクチャ削除"
    
    cd "$TERRAFORM_DIR"
    
    if [ ! -f "terraform.tfstate" ]; then
        log_warning "削除するリソースが見つかりません"
        return
    fi
    
    log_warning "⚠️  警告: すべてのAWSリソースが削除されます！"
    log_warning "⚠️  データベースのデータも失われます！"
    echo ""
    
    if [ "$SKIP_CONFIRM" = false ]; then
        read -p "本当に削除しますか? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log_warning "削除をキャンセルしました"
            return
        fi
        
        read -p "最終確認: 'DELETE' と入力してください: " final_confirm
        if [ "$final_confirm" != "DELETE" ]; then
            log_warning "削除をキャンセルしました"
            return
        fi
    fi
    
    log_info "リソースを削除しています..."
    terraform destroy -auto-approve
    
    log_success "✅ すべてのリソースを削除しました"
}

# ========================================
# Full Deployment
# ========================================
full_deployment() {
    log_step "フルデプロイ開始"
    
    echo ""
    log_info "以下の順序で実行します："
    echo "  1. 前提条件チェック"
    echo "  2. Terraform初期化"
    echo "  3. インフラデプロイ"
    echo "  4. アプリケーションアップロード"
    echo "  5. アプリケーション設定"
    echo "  6. データベース初期化"
    echo "  7. アプリケーション起動"
    echo ""
    
    if [ "$SKIP_CONFIRM" = false ]; then
        read -p "続行しますか? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log_warning "デプロイをキャンセルしました"
            exit 0
        fi
    fi
    
    # Execute steps
    check_prerequisites || exit 1
    setup_terraform
    deploy_infrastructure
    upload_application
    configure_application
    initialize_database
    start_application
    
    echo ""
    log_step "デプロイ完了"
    show_status
    
    echo ""
    log_success "🎉 システムが正常に稼働しています！"
    echo ""
    echo "次のステップ:"
    echo "  - アクセス: http://$(cd $TERRAFORM_DIR && terraform output -raw ec2_public_ip 2>/dev/null)"
    echo "  - ステータス確認: $0 status"
    echo "  - ログ表示: $0 logs"
    echo "  - SSH接続: $0 ssh"
    echo ""
}

# ========================================
# Main
# ========================================
main() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  AWS Production Management System - Startup Script       ║${NC}"
    echo -e "${CYAN}║  生産管理システム AWS稼働開始スクリプト                    ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    case "$COMMAND" in
        check)
            check_prerequisites
            ;;
        setup)
            check_prerequisites || exit 1
            setup_terraform
            ;;
        deploy)
            check_prerequisites || exit 1
            setup_terraform
            deploy_infrastructure
            ;;
        start)
            get_ec2_info
            
            # Check if application files are uploaded
            ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no -o ConnectTimeout=5 ec2-user@$EC2_IP \
                "test -f /opt/production-management/docker-compose.yml" 2>/dev/null || {
                log_warning "アプリケーションファイルがアップロードされていません"
                upload_application
                configure_application
                initialize_database
            }
            
            start_application
            show_status
            ;;
        full)
            full_deployment
            ;;
        status)
            show_status
            ;;
        stop)
            stop_system
            ;;
        restart)
            restart_system
            ;;
        logs)
            show_logs
            ;;
        ssh)
            ssh_connect
            ;;
        destroy)
            destroy_infrastructure
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            echo ""
            usage
            exit 1
            ;;
    esac
}

# Run main
main "$@"
