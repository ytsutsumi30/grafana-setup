# コスト最適化ガイド

## 💰 月額コスト詳細

### 基本構成 ($19-24/月 @ 160時間稼働)

| リソース | タイプ | 稼働時間/月 | 月額料金 |
|---------|--------|------------|----------|
| EC2 | t3.micro | 160h | $3-4 |
| RDS | db.t3.micro | 160h | $12-15 |
| EBS | gp3 30GB | 720h | $3 |
| Elastic IP | - | 160h | $0 |
| Data Transfer | ~1GB | - | $1-2 |
| **合計** | | | **$19-24** |

### 24時間稼働の場合 ($30-35/月)

| リソース | タイプ | 稼働時間/月 | 月額料金 |
|---------|--------|------------|----------|
| EC2 | t3.micro | 720h | $7-8 |
| RDS | db.t3.micro | 720h | $16-18 |
| EBS | gp3 30GB | 720h | $3 |
| Elastic IP | - | 720h | $0 |
| Data Transfer | ~5GB | - | $4-6 |
| **合計** | | | **$30-35** |

---

## 🎯 コスト削減戦略

### 1. スケジューラ最適化 (最大75%削減)

#### パターンA: 平日営業時間のみ (月40時間)
```hcl
# terraform.tfvars
start_schedule = "cron(0 0 ? * MON *)"     # 月曜 9:00 JST 起動
stop_schedule  = "cron(0 10 ? * FRI *)"    # 金曜 19:00 JST 停止

# 月額: ~$8-12 (75%削減)
```

#### パターンB: 平日のみ24時間稼働 (月480時間)
```hcl
start_schedule = "cron(0 15 ? * SUN *)"    # 月曜 00:00 JST 起動
stop_schedule  = "cron(0 15 ? * FRI *)"    # 土曜 00:00 JST 停止

# 月額: ~$20-25 (約33%削減)
```

#### パターンC: 平日9-19時 (月200時間)
```hcl
start_schedule = "cron(0 0 ? * MON-FRI *)"   # 平日 9:00 JST 起動
stop_schedule  = "cron(0 10 ? * MON-FRI *)"  # 平日 19:00 JST 停止

# 月額: ~$22-28 (約20%削減)
```

### 2. インスタンスサイズの最適化

#### 現在の構成
```hcl
instance_type = "t3.micro"      # 1 vCPU, 1GB RAM, $0.0104/h
db_instance_class = "db.t3.micro"  # 2 vCPU, 1GB RAM, $0.017/h
```

#### メモリ不足の場合
```hcl
instance_type = "t3.small"      # 2 vCPU, 2GB RAM, $0.0208/h (+$7/月)
db_instance_class = "db.t3.small"  # 2 vCPU, 2GB RAM, $0.034/h (+$12/月)

# 追加コスト: 160h稼働で +$19/月
```

#### パフォーマンス重視の場合
```hcl
instance_type = "t3.medium"     # 2 vCPU, 4GB RAM, $0.0416/h (+$21/月)
db_instance_class = "db.t3.medium" # 2 vCPU, 4GB RAM, $0.068/h (+$37/月)

# 追加コスト: 160h稼働で +$58/月
```

### 3. RDS停止時の注意事項

**重要**: RDSは7日間停止後、自動的に再起動されます

#### 長期停止の場合
```bash
# 1. スナップショット作成
aws rds create-db-snapshot \
  --db-instance-identifier poc-production-db \
  --db-snapshot-identifier poc-longterm-snapshot

# 2. RDS削除
terraform destroy -target=module.rds

# 3. 再開時にスナップショットから復元
# terraform.tfvarsに追加:
# snapshot_identifier = "poc-longterm-snapshot"
```

### 4. ストレージ最適化

#### EBSボリューム削減
```hcl
# modules/ec2/main.tf
root_block_device {
  volume_size = 20  # 30GB -> 20GB (-$1/月)
}
```

#### RDSストレージ最適化
```hcl
# modules/rds/main.tf
allocated_storage = 20      # デフォルト
max_allocated_storage = 30  # 自動拡張上限を設定

# 不要なバックアップ削減
backup_retention_period = 3  # 7 -> 3日 (ストレージ節約)
```

### 5. データ転送コスト削減

#### CloudFrontの利用 (大量アクセス時)
```hcl
# CloudFrontを追加してデータ転送コスト削減
# 1GB/月以下なら不要
```

#### VPCエンドポイント活用
```hcl
# S3やDynamoDBアクセス時のNAT料金削減
# POC環境では通常不要
```

---

## 📊 コスト比較シミュレーション

### シナリオ1: 最小構成 (月40時間)
```
EC2 t3.micro (40h):      $0.42
RDS db.t3.micro (40h):   $0.68
EBS (30GB):              $3.00
────────────────────────────
合計:                    ~$4-5/月
```

### シナリオ2: POC標準 (月160時間)
```
EC2 t3.micro (160h):     $1.66
RDS db.t3.micro (160h):  $2.72
EBS (30GB):              $3.00
Data Transfer:           $1.00
────────────────────────────
合計:                    ~$8-9/月
```

### シナリオ3: 平日フル稼働 (月480時間)
```
EC2 t3.micro (480h):     $5.00
RDS db.t3.micro (480h):  $8.16
EBS (30GB):              $3.00
Data Transfer:           $2.00
────────────────────────────
合計:                    ~$18-20/月
```

### シナリオ4: 24時間運用 (月720時間)
```
EC2 t3.micro (720h):     $7.49
RDS db.t3.micro (720h):  $12.24
EBS (30GB):              $3.00
Data Transfer:           $5.00
────────────────────────────
合計:                    ~$27-30/月
```

---

## 🚀 スケールアップ時の料金

### 小規模本番環境 (~$100-150/月)
```hcl
# Multi-AZ, t3.small
instance_type = "t3.small"
db_instance_class = "db.t3.small"
multi_az = true

# 内訳:
# - EC2 t3.small (24h): $15
# - RDS db.t3.small Multi-AZ (24h): $50
# - EBS: $10
# - Data Transfer: $10
# - Backup: $10
# - ALB追加: $25
```

### 中規模本番環境 (~$300-400/月)
```hcl
# Multi-AZ, t3.medium
instance_type = "t3.medium"
db_instance_class = "db.t3.medium"
multi_az = true

# + CloudFront
# + Route53
# + ACM SSL証明書 (無料)
```

---

## 💡 コスト削減チェックリスト

### 即効性のある対策
- [ ] スケジューラーを有効化
- [ ] 平日のみ稼働に変更
- [ ] 不要な時間帯は手動停止
- [ ] RDS長期停止時はスナップショット化

### 設計段階での対策
- [ ] Single-AZ構成を維持
- [ ] t3.microを継続使用
- [ ] バックアップ保持期間を最小化
- [ ] 不要なログを無効化

### 監視・最適化
- [ ] AWS Cost Explorerで日次確認
- [ ] CloudWatchアラーム設定
- [ ] 月次レビューの実施
- [ ] 使用していないリソースの削除

---

## 📈 コストモニタリング

### AWS Cost Explorerで確認
```bash
# 月次コスト確認
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://cost-filter.json

# cost-filter.json
{
  "Tags": {
    "Key": "Environment",
    "Values": ["poc"]
  }
}
```

### コストアラート設定
```bash
# $25超過でアラート
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget.json
```

### 推奨アラート閾値
- **Warning**: $20/月
- **Critical**: $30/月
- **Emergency**: $50/月

---

## 🎯 目標予算別推奨構成

### $10-15/月
- 平日営業時間のみ運用 (40-80h)
- t3.micro維持
- Single-AZ
- バックアップ最小限

### $20-25/月 (標準POC)
- 平日9-19時運用 (160-200h)
- t3.micro維持
- Single-AZ
- 7日バックアップ

### $30-40/月 (24時間POC)
- 24時間運用
- t3.small検討
- Single-AZ
- 自動バックアップ有効

### $50-100/月 (準本番)
- 24時間運用
- t3.small以上
- Multi-AZ検討
- ALB追加
- 詳細モニタリング

---

## 📞 コスト超過時の対処

### 即座に実施
1. インスタンス停止
2. スケジューラー確認
3. 不要なリソース削除

### 原因調査
```bash
# 詳細なコスト分析
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "7 days ago" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

### 恒久対策
- スケジュール見直し
- インスタンスタイプ変更
- 不要な機能の無効化
