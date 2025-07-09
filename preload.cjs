const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const net = require('net');

// ネットワーク接続を管理するための変数
let socket = null;
let socketDataListener = null;

// コマンドキューとタイマー管理
let commandQueue = [];
let commandTimer = null;
let isProcessingQueue = false;

// タイムアウト設定（30ms）
const COMMAND_INTERVAL = 30;

// キュー処理関数
const processCommandQueue = () => {
  if (commandQueue.length === 0 || !socket || !socket.writable || isProcessingQueue) {
    return;
  }

  isProcessingQueue = true;
  const command = commandQueue.shift();

  try {
    socket.write(command);
  } catch (error) {
    console.error('コマンド送信エラー:', error);
  }

  // 次のコマンド処理をスケジュール
  setTimeout(() => {
    isProcessingQueue = false;
    processCommandQueue();
  }, COMMAND_INTERVAL);
};

// キュー処理タイマーを開始
const startCommandTimer = () => {
  if (commandTimer) {
    clearInterval(commandTimer);
  }

  commandTimer = setInterval(() => {
    processCommandQueue();
  }, COMMAND_INTERVAL);
};

// キュー処理タイマーを停止
const stopCommandTimer = () => {
  if (commandTimer) {
    clearInterval(commandTimer);
    commandTimer = null;
  }
  isProcessingQueue = false;
};

// contextBridgeを通じてAPIを提供
contextBridge.exposeInMainWorld('electronAPI', {
  // ファイルシステム機能
  writeFile: (filePath, data) => {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, data, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  readFile: (filePath) => {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  },

  // ネットワーク機能
  connectToServer: (host, port) => {
    return new Promise((resolve, reject) => {
      socket = new net.Socket();

      socket.on('connect', () => {
        // 接続成功時にコマンドタイマーを開始
        startCommandTimer();
        resolve();
      });

      socket.on('data', (data) => {
        const response = data.toString();

        // レンダラープロセスにデータを送信
        ipcRenderer.send('socket-data', response);
      });

      socket.on('close', () => {
        socket = null;
        // 接続が閉じた場合、タイマーを停止
        stopCommandTimer();
        commandQueue = [];
      });

      socket.on('error', (error) => {
        reject(error);
      });

      socket.connect(port, host);
    });
  },

  sendCommand: (command) => {
    if (!socket || !socket.writable) {
      return false;
    }

    // コマンドをキューに追加
    commandQueue.push(command);

    // キューが空でない場合、処理を開始
    if (commandQueue.length === 1 && !isProcessingQueue) {
      processCommandQueue();
    }

    return true;
  },

  disconnect: () => {
    if (socket) {
      // タイマーを停止
      stopCommandTimer();

      // キューをクリア
      commandQueue = [];

      socket.destroy();
      socket = null;
    }
  },

  // IPCイベントリスナーを設定
  onSocketData: (callback) => {
    socketDataListener = callback;
    ipcRenderer.on('socket-data', (event, data) => {
      if (socketDataListener) {
        socketDataListener(data);
      }
    });
  },

  // リスナーを削除
  removeSocketDataListener: () => {
    if (socketDataListener) {
      ipcRenderer.removeAllListeners('socket-data');
      socketDataListener = null;
    }
  },

  // 終了確認ダイアログを表示
  showExitDialog: () => {
    ipcRenderer.send('show-exit-dialog');
  },

  // アプリケーションを終了
  closeApp: () => {
    ipcRenderer.send('close-app');
  }
});
