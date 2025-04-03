const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// 配置项
const config = {
  appName: 'MyWebApp',
  defaultUrl: 'http://127.0.0.1:5244/',  // 替换为你的网页地址
  extensionPath: path.join(__dirname, 'extensions/my-extension')  // 替换为你的扩展路径
};

// 创建主窗口
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    },
    icon: path.join(__dirname, 'assets/icon.ico')  // 应用图标
  });

  // 加载网页
  mainWindow.loadURL(config.defaultUrl);

  // 开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // 窗口关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 加载扩展
  loadExtensions();
}

// 加载浏览器扩展
async function loadExtensions() {
  try {
    if (fs.existsSync(config.extensionPath)) {
      await session.defaultSession.loadExtension(config.extensionPath);
      console.log('Extension loaded successfully');
    }
  } catch (err) {
    console.error('Failed to load extension:', err);
  }
}

// 获取数据存储路径
function getDataPath() {
  // 尝试写入 exe 所在目录（适用于绿色版）
  const exeDir = path.dirname(app.getPath('exe'));
  const localDataPath = path.join(exeDir, 'data');

  try {
    // 检查是否可写
    fs.accessSync(exeDir, fs.constants.W_OK);
    return localDataPath;
  } catch (err) {
    // 不可写，则使用 AppData
    return path.join(app.getPath('appData'), config.appName, 'data');
  }
}

// 确保数据目录存在
function ensureDataDir() {
  const dataPath = getDataPath();
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  return dataPath;
}

// 保存数据
function saveData(filename, data) {
  try {
    const dataPath = ensureDataDir();
    fs.writeFileSync(path.join(dataPath, filename), JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Save data failed:', err);
    return false;
  }
}

// 读取数据
function loadData(filename) {
  try {
    const dataPath = ensureDataDir();
    const filePath = path.join(dataPath, filename);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath));
    }
    return null;
  } catch (err) {
    console.error('Load data failed:', err);
    return null;
  }
}

// 初始化应用
app.whenReady().then(() => {
  createWindow();

  // macOS 特殊处理
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // 初始化数据目录
  ensureDataDir();
});

// 窗口全部关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC 通信示例
ipcMain.handle('save-data', (event, { filename, data }) => {
  return saveData(filename, data);
});

ipcMain.handle('load-data', (event, filename) => {
  return loadData(filename);
});

// 错误处理
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
