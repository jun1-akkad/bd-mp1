import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 開発環境の設定
const isDev = process.env.NODE_ENV === 'development';

function createWindow () {
  const win = new BrowserWindow({
    width: 480,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // 開発環境と本番環境で読み込むURLを分ける
  if (isDev) {
    win.loadURL('http://localhost:5173');
    // 開発時はDevToolsを開く
    win.webContents.openDevTools();
  } else {
    // 本番環境ではローカルのHTMLファイルを読み込む
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // IPCイベントハンドラーを設定
  ipcMain.on('socket-data', (event, data) => {
    console.log('Main process received socket-data:', data);
    // レンダラープロセスにデータを転送
    console.log('Forwarding socket-data to renderer process...');
    win.webContents.send('socket-data', data);
    console.log('socket-data forwarded to renderer process');
  });

  // 終了確認ダイアログを表示
  ipcMain.on('show-exit-dialog', async (event) => {
    const result = await dialog.showMessageBox(win, {
      type: 'question',
      buttons: ['キャンセル', '終了'],
      defaultId: 0,
      cancelId: 0,
      title: 'アプリケーション終了',
      message: 'アプリケーションを終了しますか？',
      detail: '現在の作業内容は保存されません。'
    });

    if (result.response === 1) {
      // 終了ボタンが押された場合
      app.quit();
    }
  });

  // アプリケーションを終了
  ipcMain.on('close-app', () => {
    app.quit();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
