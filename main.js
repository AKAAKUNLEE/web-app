const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // 加载你的网页
  win.loadURL('https://127.0.0.1:5244');

  // 加载 Chrome 扩展（解压的扩展文件夹）
  session.defaultSession.loadExtension(
    path.join(__dirname, 'extensions/your-extension') // 替换为你的扩展路径
  );
}

app.whenReady().then(createWindow);
