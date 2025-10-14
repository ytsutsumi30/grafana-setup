#!/bin/bash

# 改行コード修正スクリプト
echo "🔧 改行コードをWindows形式(CRLF)からUnix形式(LF)に変換しています..."

# manage.shの改行コードを修正
if [ -f "manage.sh" ]; then
    echo "📝 manage.sh を修正中..."
    # CRLFをLFに変換（sedを使用）
    sed -i 's/\r$//' manage.sh
    # 実行権限を付与
    chmod +x manage.sh
    echo "✅ manage.sh の修正完了"
else
    echo "❌ manage.sh が見つかりません"
fi

# その他のスクリプトファイルも確認・修正
for file in *.sh; do
    if [ -f "$file" ] && [ "$file" != "fix-line-endings.sh" ]; then
        echo "📝 $file を修正中..."
        sed -i 's/\r$//' "$file"
        chmod +x "$file"
        echo "✅ $file の修正完了"
    fi
done

echo "🎉 改行コードの修正が完了しました！"
echo "💡 これで ./manage.sh start が正常に動作するはずです"
