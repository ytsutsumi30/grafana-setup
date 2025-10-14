#!/bin/bash
# 生産管理システム統合環境の管理スクリプト

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 色付きログ出力
log_info() {
    echo -e "\e[34m[INFO]\e[0m $1"
}

log_success() {
    echo -e "\e[32m[SUCCESS]\e[0m $1"
}

log_warn() {
    echo -e "\e[33m[WARN]\e[0m $1"
}

log_error() {
    echo -e "\e[31m[ERROR]\e[0m $1"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker がインストールされていません"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose がインストールされていません"
        exit 1
    fi
}

start_system() {
    log_info "🚀 生産管理システムを起動しています..."
    check_docker
    
    # データベースを先に起動
    log_info "📊 PostgreSQL を起動中..."
    docker-compose up -d postgres
    
    # データベースの準備完了を待機
    log_info "⏳ データベースの準備完了を待機中..."
    sleep 10
    
    # メインサービス（Grafana・Prometheus除く）を起動
    log_info "🌐 Web サービスを起動中..."
    docker-compose up -d nginx production-api
    
    # 起動確認
    sleep 5
    log_info "📋 サービス状況を確認中..."
    docker-compose ps
    
    log_success "✅ システム起動完了!"
    echo ""
    echo "📱 アクセス情報:"
    echo "   🏠 生産管理システム: http://localhost"
    echo "   �️  API: http://localhost/api/health"
    echo ""
    echo "📊 監視システム（別途管理）:"
    echo "   ./manage.sh monitoring start  - Grafana・Prometheus起動"
    echo "   ./manage.sh monitoring stop   - Grafana・Prometheus停止"
    echo ""
    echo "🔧 管理コマンド:"
    echo "   ./manage.sh stop    - システム停止"
    echo "   ./manage.sh logs    - ログ確認"
    echo "   ./manage.sh status  - 状況確認"
}

stop_system() {
    log_info "🛑 生産管理システムを停止しています..."
    # メインサービスのみ停止（Grafana・Prometheus除く）
    docker-compose stop nginx production-api postgres
    docker-compose rm -f nginx production-api postgres
    log_success "✅ システム停止完了! (監視システムは継続稼働中)"
}

restart_system() {
    log_info "🔄 生産管理システムを再起動しています..."
    # メインサービスのみ再起動
    docker-compose restart nginx production-api postgres
    log_success "✅ システム再起動完了!"
}

manage_monitoring() {
    case "$1" in
        start)
            log_info "📊 監視システムを起動しています..."
            docker-compose --profile monitoring up -d grafana prometheus
            
            # 起動完了まで少し待機
            sleep 8
            
            log_info "🔧 nginx設定を動的に更新中..."
            # バックアップを作成
            cp nginx/conf.d/default.conf nginx/conf.d/default.conf.monitoring_backup
            
            # 監視システム用の設定ファイルを作成
            cat > nginx/conf.d/monitoring.conf << 'EOF'
# 監視システム用設定（動的に追加される）
location /grafana/ {
    proxy_pass http://grafana:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

location /prometheus/ {
    proxy_pass http://prometheus:9090/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
EOF
            
            # nginx設定をリロード
            docker exec production-nginx nginx -s reload
            
            log_success "✅ 監視システム起動完了!"
            echo ""
            echo "📊 監視システムアクセス情報:"
            echo "   📊 Grafana: http://localhost/grafana/ (admin/admin123)"
            echo "   📈 Prometheus: http://localhost/prometheus/"
            ;;
        stop)
            log_info "📊 監視システムを停止しています..."
            
            # 監視システム用設定ファイルを削除
            rm -f nginx/conf.d/monitoring.conf
            
            # nginx設定をリロード
            docker exec production-nginx nginx -s reload 2>/dev/null || true
            
            # コンテナを停止
            docker-compose stop grafana prometheus 2>/dev/null || true
            docker-compose rm -f grafana prometheus 2>/dev/null || true
            
            log_success "✅ 監視システム停止完了!"
            ;;
        status)
            log_info "📊 監視システム状況:"
            docker-compose ps grafana prometheus 2>/dev/null || echo "監視システムは停止中です"
            
            if [ -f nginx/conf.d/monitoring.conf ]; then
                echo "nginx監視設定: 有効"
            else
                echo "nginx監視設定: 無効"
            fi
            ;;
        *)
            echo "使用法: $0 monitoring {start|stop|status}"
            echo "  start  - Grafana・Prometheus起動（nginx設定も動的追加）"
            echo "  stop   - Grafana・Prometheus停止（nginx設定も動的削除）" 
            echo "  status - Grafana・Prometheus状況確認"
            exit 1
            ;;
    esac
}

show_logs() {
    log_info "📋 システムログを表示します (Ctrl+C で終了)..."
    docker-compose logs -f
}

show_status() {
    log_info "📊 サービス状況:"
    docker-compose ps
    echo ""
    
    log_info "🌐 サービス接続確認:"
    
    # nginx 確認
    if curl -s http://localhost/health > /dev/null 2>&1; then
        log_success "nginx: 正常"
    else
        log_error "nginx: 接続失敗"
    fi
    
    # API 確認
    if curl -s http://localhost/api/health > /dev/null 2>&1; then
        log_success "API: 正常"
    else
        log_error "API: 接続失敗"
    fi
    
    # PostgreSQL 確認
    if docker-compose exec -T postgres pg_isready > /dev/null 2>&1; then
        log_success "PostgreSQL: 正常"
    else
        log_error "PostgreSQL: 接続失敗"
    fi
}

clean_system() {
    log_warn "🧹 システムを完全にクリーンアップします..."
    read -p "データも削除されます。続行しますか？ (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v --remove-orphans
        docker system prune -f
        log_success "✅ クリーンアップ完了!"
    else
        log_info "クリーンアップをキャンセルしました"
    fi
}

backup_data() {
    log_info "💾 データベースをバックアップしています..."
    BACKUP_DIR="backups"
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="${BACKUP_DIR}/production_db_${TIMESTAMP}.sql"
    
    mkdir -p "$BACKUP_DIR"
    
    docker-compose exec -T postgres pg_dump -U production_user production_db > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        log_success "✅ バックアップ完了: $BACKUP_FILE"
    else
        log_error "❌ バックアップ失敗"
        exit 1
    fi
}

show_help() {
    cat << EOF
生産管理システム統合環境 管理スクリプト

使用方法: $0 {command}

📋 利用可能なコマンド:

🚀 基本操作:
   start        システムを起動
   stop         システムを停止
   restart      システムを再起動

📊 監視システム（動的管理）:
   monitoring start   Grafana・Prometheus起動（nginx設定も自動追加）
   monitoring stop    Grafana・Prometheus停止（nginx設定も自動削除）
   monitoring status  Grafana・Prometheus状況確認

📊 監視・確認:
   status       サービス状況を表示
   logs         ログを表示 (リアルタイム)

🛠️  メンテナンス:
   clean        環境を完全にクリーンアップ (データ削除)
   backup       データベースをバックアップ

📖 ヘルプ:
   help         このヘルプを表示

🌐 アクセス先:
   生産管理システム: http://localhost
   Grafana:          http://localhost/grafana/ (要手動起動)
   Prometheus:       http://localhost/prometheus/ (要手動起動)

EOF
}

# メインコマンド処理
case "$1" in
    "start")
        start_system
        ;;
    "stop")
        stop_system
        ;;
    "restart")
        restart_system
        ;;
    "monitoring")
        manage_monitoring "$2"
        ;;
    "logs")
        show_logs
        ;;
    "status")
        show_status
        ;;
    "clean")
        clean_system
        ;;
    "backup")
        backup_data
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        log_error "不正なコマンド: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
