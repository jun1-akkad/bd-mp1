const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const net = require('net');
const { exec } = require('child_process');
const os = require('os');

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

// MacアドレスからIPアドレスを取得する関数
const getIpFromMacAddress = (macAddress) => {
  return new Promise((resolve, reject) => {
    const platform = os.platform();

    if (platform === 'darwin') {
      // macOSの場合
      exec('arp -a', (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes(macAddress.toLowerCase()) || line.includes(macAddress.toUpperCase())) {
            const match = line.match(/\(([0-9.]+)\)/);
            if (match) {
              resolve(match[1]);
              return;
            }
          }
        }
        resolve(null);
      });
    } else if (platform === 'win32') {
      // Windowsの場合
      exec('arp -a', (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes(macAddress.toLowerCase()) || line.includes(macAddress.toUpperCase())) {
            const match = line.match(/([0-9.]+)/);
            if (match) {
              resolve(match[1]);
              return;
            }
          }
        }
        resolve(null);
      });
    } else {
      // Linuxの場合
      exec('arp -a', (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes(macAddress.toLowerCase()) || line.includes(macAddress.toUpperCase())) {
            const match = line.match(/\(([0-9.]+)\)/);
            if (match) {
              resolve(match[1]);
              return;
            }
          }
        }
        resolve(null);
      });
    }
  });
};

// ネットワーク内のすべてのデバイスをスキャンする関数
const scanNetworkDevices = () => {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    const networkInterface = getDefaultNetworkInterface();

    if (!networkInterface) {
      reject(new Error('ネットワークインターフェースが見つかりません'));
      return;
    }

    const baseIp = networkInterface.address.replace(/\d+$/, '');
    const foundDevices = [];

    // ネットワークスキャン
    const scanPromises = [];
    for (let i = 1; i <= 254; i++) {
      const ip = `${baseIp}${i}`;
      scanPromises.push(pingAndGetMac(ip));
    }

    Promise.allSettled(scanPromises).then((results) => {
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          foundDevices.push(result.value);
        }
      }
      resolve(foundDevices);
    });
  });
};

// 特定のIPアドレスにpingしてMACアドレスを取得
const pingAndGetMac = (ip) => {
  return new Promise((resolve) => {
    const platform = os.platform();
    const pingCmd = platform === 'win32' ? `ping -n 1 -w 1000 ${ip}` : `ping -c 1 -W 1 ${ip}`;

    exec(pingCmd, (error) => {
      if (error) {
        resolve(null);
        return;
      }

      // pingが成功した場合、ARPテーブルでMACアドレスを確認
      getMacFromIp(ip).then((macAddress) => {
        if (macAddress) {
          resolve({ ip, mac: macAddress });
        } else {
          resolve(null);
        }
      }).catch(() => {
        resolve(null);
      });
    });
  });
};

// IPアドレスからMACアドレスを取得する関数
const getMacFromIp = (ipAddress) => {
  return new Promise((resolve, reject) => {
    const platform = os.platform();

    if (platform === 'darwin') {
      // macOSの場合
      exec('arp -a', (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes(ipAddress)) {
            const match = line.match(/([0-9a-fA-F]{1,2}[:-]){5}([0-9a-fA-F]{1,2})/);
            if (match) {
              resolve(match[0]);
              return;
            }
          }
        }
        resolve(null);
      });
    } else if (platform === 'win32') {
      // Windowsの場合
      exec('arp -a', (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes(ipAddress)) {
            const match = line.match(/([0-9a-fA-F]{1,2}-){5}([0-9a-fA-F]{1,2})/);
            if (match) {
              resolve(match[0]);
              return;
            }
          }
        }
        resolve(null);
      });
    } else {
      // Linuxの場合
      exec('arp -a', (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes(ipAddress)) {
            const match = line.match(/([0-9a-fA-F]{1,2}:){5}([0-9a-fA-F]{1,2})/);
            if (match) {
              resolve(match[0]);
              return;
            }
          }
        }
        resolve(null);
      });
    }
  });
};

// ネットワークスキャンでデバイスを検索する関数
const scanNetworkForDevice = (targetMacAddress) => {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    const networkInterface = getDefaultNetworkInterface();

    if (!networkInterface) {
      reject(new Error('ネットワークインターフェースが見つかりません'));
      return;
    }

    const baseIp = networkInterface.address.replace(/\d+$/, '');
    const foundDevices = [];

    // ネットワークスキャン（簡易版）
    const scanPromises = [];
    for (let i = 1; i <= 254; i++) {
      const ip = `${baseIp}${i}`;
      scanPromises.push(pingAndCheckMac(ip, targetMacAddress));
    }

    Promise.allSettled(scanPromises).then((results) => {
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          foundDevices.push(result.value);
        }
      }
      resolve(foundDevices);
    });
  });
};

// デフォルトネットワークインターフェースを取得
const getDefaultNetworkInterface = () => {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    const iface = interfaces[name];
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias;
      }
    }
  }
  return null;
};

// 特定のIPアドレスにpingしてMacアドレスを確認
const pingAndCheckMac = (ip, targetMac) => {
  return new Promise((resolve) => {
    const platform = os.platform();
    const pingCmd = platform === 'win32' ? `ping -n 1 -w 1000 ${ip}` : `ping -c 1 -W 1 ${ip}`;

    exec(pingCmd, (error) => {
      if (error) {
        resolve(null);
        return;
      }

      // pingが成功した場合、ARPテーブルでMacアドレスを確認
      getIpFromMacAddress(targetMac).then((foundIp) => {
        if (foundIp === ip) {
          resolve({ ip, mac: targetMac });
        } else {
          resolve(null);
        }
      }).catch(() => {
        resolve(null);
      });
    });
  });
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
  },

  // MacアドレスからIPアドレスを取得
  getIpFromMacAddress: (macAddress) => {
    return getIpFromMacAddress(macAddress);
  },

  // ネットワークスキャンでデバイスを検索
  scanNetworkForDevice: (macAddress) => {
    return scanNetworkForDevice(macAddress);
  },

  // ネットワーク内のすべてのデバイスをスキャン
  scanNetworkDevices: () => {
    return scanNetworkDevices();
  }
});
