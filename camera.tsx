import React, { useState, useEffect } from 'react';
import { Camera, AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';

const CameraDebugTest = () => {
  const [logs, setLogs] = useState([]);
  const [testResults, setTestResults] = useState({});
  const [isTestingPermissions, setIsTestingPermissions] = useState(false);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, timestamp }]);
  };

  const testUserMedia = async () => {
    setIsTestingPermissions(true);
    setLogs([]);
    addLog('カメラアクセステストを開始します', 'info');

    // 1. navigator.mediaDevices の確認
    if (!navigator.mediaDevices) {
      addLog('❌ navigator.mediaDevices が利用できません', 'error');
      setTestResults(prev => ({ ...prev, mediaDevices: false }));
      return;
    } else {
      addLog('✅ navigator.mediaDevices が利用可能です', 'success');
      setTestResults(prev => ({ ...prev, mediaDevices: true }));
    }

    // 2. getUserMedia の確認
    if (!navigator.mediaDevices.getUserMedia) {
      addLog('❌ getUserMedia が利用できません', 'error');
      setTestResults(prev => ({ ...prev, getUserMedia: false }));
      return;
    } else {
      addLog('✅ getUserMedia が利用可能です', 'success');
      setTestResults(prev => ({ ...prev, getUserMedia: true }));
    }

    // 3. デバイス一覧の取得
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      addLog(`📹 検出されたカメラ数: ${videoDevices.length}`, 'info');
      
      videoDevices.forEach((device, index) => {
        addLog(`  カメラ${index + 1}: ${device.label || 'Unknown Camera'}`, 'info');
      });
      
      setTestResults(prev => ({ ...prev, cameras: videoDevices.length }));
    } catch (error) {
      addLog(`❌ デバイス一覧の取得に失敗: ${error.message}`, 'error');
    }

    // 4. 権限の確認（Permissions API）
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'camera' });
        addLog(`🔒 カメラ権限の状態: ${permission.state}`, 'info');
        setTestResults(prev => ({ ...prev, permission: permission.state }));
      } else {
        addLog('⚠️ Permissions API が利用できません（iOS Safari等）', 'warn');
        setTestResults(prev => ({ ...prev, permission: 'not_available' }));
      }
    } catch (error) {
      addLog(`❌ 権限チェック失敗: ${error.message}`, 'error');
    }

    // 5. 実際にカメラアクセスを試行
    addLog('📱 実際のカメラアクセスを試行中...', 'info');
    
    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      addLog('🎉 カメラアクセス成功！', 'success');
      
      // ストリーム情報
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        const track = videoTracks[0];
        const settings = track.getSettings();
        addLog(`📐 解像度: ${settings.width}x${settings.height}`, 'info');
        addLog(`📷 使用カメラ: ${track.label}`, 'info');
      }
      
      // ストリームを停止
      stream.getTracks().forEach(track => track.stop());
      setTestResults(prev => ({ ...prev, access: 'success' }));
      
    } catch (error) {
      addLog(`❌ カメラアクセス失敗: ${error.name} - ${error.message}`, 'error');
      setTestResults(prev => ({ ...prev, access: 'failed', error: error.name }));
      
      // エラーの詳細解説
      switch (error.name) {
        case 'NotAllowedError':
          addLog('💡 ユーザーがカメラの使用を拒否しました', 'warn');
          break;
        case 'NotFoundError':
          addLog('💡 カメラデバイスが見つかりません', 'warn');
          break;
        case 'NotSupportedError':
          addLog('💡 このブラウザではカメラがサポートされていません', 'warn');
          break;
        case 'NotReadableError':
          addLog('💡 カメラが他のアプリで使用中です', 'warn');
          break;
        case 'SecurityError':
          addLog('💡 セキュリティ制限によりアクセスできません（HTTPSが必要）', 'warn');
          break;
      }
    }

    // 6. iframe 検出
    if (window.self !== window.top) {
      addLog('⚠️ iframe内で実行されています', 'warn');
      addLog('💡 iframe のカメラアクセスは制限される場合があります', 'warn');
      setTestResults(prev => ({ ...prev, iframe: true }));
    } else {
      addLog('✅ iframe外で実行されています', 'success');
      setTestResults(prev => ({ ...prev, iframe: false }));
    }

    // 7. プロトコルの確認
    const protocol = window.location.protocol;
    addLog(`🔐 現在のプロトコル: ${protocol}`, protocol === 'https:' ? 'success' : 'warn');
    setTestResults(prev => ({ ...prev, protocol }));

    setIsTestingPermissions(false);
    addLog('🏁 テスト完了', 'info');
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} className="text-green-500" />;
      case 'error': return <XCircle size={16} className="text-red-500" />;
      case 'warn': return <AlertCircle size={16} className="text-yellow-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-700 bg-green-50 border-green-200';
      case 'error': return 'text-red-700 bg-red-50 border-red-200';
      case 'warn': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Camera className="text-blue-600" />
            カメラアクセス診断ツール
          </h1>
          
          <p className="text-gray-600 mb-6">
            このツールでカメラアクセスの問題を診断できます。
          </p>

          <button
            onClick={testUserMedia}
            disabled={isTestingPermissions}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Camera size={20} />
            {isTestingPermissions ? '診断中...' : '診断開始'}
          </button>
        </div>

        {logs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">診断結果</h2>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border text-sm flex items-start gap-2 ${getLogColor(log.type)}`}
                >
                  {getLogIcon(log.type)}
                  <div className="flex-1">
                    <span className="text-xs text-gray-500">{log.timestamp}</span>
                    <div>{log.message}</div>
                  </div>
                </div>
              ))}
            </div>

            {Object.keys(testResults).length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <h3 className="font-medium mb-3">要約</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>MediaDevices API: {testResults.mediaDevices ? '✅' : '❌'}</div>
                  <div>getUserMedia: {testResults.getUserMedia ? '✅' : '❌'}</div>
                  <div>検出カメラ数: {testResults.cameras || '未確認'}</div>
                  <div>権限状態: {testResults.permission || '未確認'}</div>
                  <div>アクセス結果: {testResults.access === 'success' ? '✅ 成功' : testResults.access === 'failed' ? '❌ 失敗' : '未実行'}</div>
                  <div>iframe: {testResults.iframe ? '⚠️ Yes' : '✅ No'}</div>
                  <div>プロトコル: {testResults.protocol === 'https:' ? '🔒 HTTPS' : '⚠️ HTTP'}</div>
                  <div>エラー種別: {testResults.error || 'なし'}</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">トラブルシューティング</h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-medium text-blue-800">iframe内での制限</h3>
              <p className="text-sm text-gray-600">
                Claude.aiのアーティファクトはiframe内で動作するため、一部のブラウザでカメラアクセスが制限される場合があります。
              </p>
            </div>
            
            <div className="border-l-4 border-yellow-500 pl-4">
              <h3 className="font-medium text-yellow-800">iOSでの設定確認</h3>
              <p className="text-sm text-gray-600">
                設定 → Safari → カメラ → 「確認」または「許可」に設定してください。
              </p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-medium text-green-800">代替案</h3>
              <p className="text-sm text-gray-600">
                ローカル環境（localhost）またはHTTPS環境でのテストをお勧めします。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraDebugTest;