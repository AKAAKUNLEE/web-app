const { app, BrowserWindow, session, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { exec } = require('child_process');

// 配置常量
const LOCAL_SERVER_URL = 'http://127.0.0.1:5244';
const FALLBACK_PAGE = 'src/fallback.html';
const MAX_RETRIES = 3;
const RETRY_INTERVAL = 3000;

class ExtensionManager {
  constructor() {
    this.extensions = new Map();
    this.storagePath = path.join(app.getPath('userData'), 'extensions.json');
    this.loadExtensions();
  }

  loadExtensions() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = JSON.parse(fs.readFileSync(this.storagePath));
        this.extensions = new Map(data);
      }
    } catch (err) {
      console.error('加载扩展配置失败:', err);
    }
  }

  saveExtensions() {
    fs.writeFileSync(
      this.storagePath,
      JSON.stringify([...this.extensions], null, 2)
    );
  }

  async installExtension(extensionPath) {
    try {
      const ext = await session.defaultSession.loadExtension(extensionPath);
      const manifest = await this.readManifest(extensionPath);
      
      this.extensions.set(ext.id, {
        id: ext.id,
        path: extensionPath,
        name: manifest.name || '未知扩展',
        version: manifest.version || '0.0.0',
        description: manifest.description || '',
        enabled: true
      });
      
      this.saveExtensions();
      return { success: true, extension: this.extensions.get(ext.id) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async readManifest(extensionPath) {
    const manifestPath = path.join(extensionPath, 'manifest.json');
    return JSON.parse(fs.readFileSync(manifestPath));
  }

  async removeExtension(id) {
    if (!this.extensions.has(id)) return false;
    
    try {
      await session.defaultSession.removeExtension(id);
      this.extensions.delete(id);
      this.saveExtensions();
      return true;
    } catch (err) {
      console.error('卸载扩展失败:', err);
      return false;
    }
  }

  getExtensionsList() {
    return Array.from(this.extensions.values()).map(ext => ({
      ...ext,
      status: ext.enabled ? '已启用' : '已禁用',
      error: !this.checkExtensionHealth(ext.id)
    }));
  }

  checkExtensionHealth(id) {
    const ext = this.extensions.get(id);
    if (!ext) return false;
    
    try {
      return fs.existsSync(path.join(ext.path, 'manifest.json'));
    } catch {
      return false;
    }
  }
}

// 主应用类
class MainApplication {
  constructor() {
    this.mainWindow = null;
    this.extensionManager = new ExtensionManager();
    this.retryCount = 0;
    this.serverProcess = null;
  }

  async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        sandbox: true,
        webSecurity: false // 允许加载本地资源
      },
      show: false // 先隐藏窗口直到内容加载完成
    });

    // 网络事件处理
    this.mainWindow.webContents.on('did-fail-load', this.handleLoadFailure.bind(this));
    this.mainWindow.on('closed', () => (this.mainWindow = null));

    // 开发工具
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }

    // 尝试连接本地服务
    await this.tryConnectServer();
  }

  async tryConnectServer() {
    const isServerReady = await this.checkServerStatus();
    
    if (isServerReady) {
      await this.loadMainWindow();
    } else {
      await this.handleServerDown();
    }
  }

  async checkServerStatus() {
    return new Promise((resolve) => {
      const client = net.createConnection({ port: 5244 }, () => {
        client.end();
        resolve(true);
      }).on('error', () => {
        resolve(false);
      });
    });
  }

  async loadMainWindow() {
    try {
      await this.mainWindow.loadURL(LOCAL_SERVER_URL);
      this.mainWindow.show();
      this.retryCount = 0; // 重置重试计数器
    } catch (err) {
      console.error('加载页面失败:', err);
      await this.handleLoadFailure();
    }
  }

  async handleLoadFailure() {
    if (this.retryCount++ < MAX_RETRIES) {
      console.log(`尝试重新连接 (${this.retryCount}/${MAX_RETRIES})...`);
      setTimeout(() => this.tryConnectServer(), RETRY_INTERVAL);
    } else {
      await this.showFallbackPage();
    }
  }

  async handleServerDown() {
    if (this.retryCount++ < MAX_RETRIES) {
      console.log(`尝试启动本地服务 (${this.retryCount}/${MAX_RETRIES})...`);
      await this.startLocalServer();
      setTimeout(() => this.tryConnectServer(), RETRY_INTERVAL);
    } else {
      await this.showFallbackPage();
    }
  }

  async startLocalServer() {
    if (this.serverProcess) return;

    return new Promise((resolve) => {
      const serverPath = app.isPackaged
        ? path.join(process.resourcesPath, 'server', 'your-server')
        : path.join(__dirname, 'server', 'your-server');

      this.serverProcess = exec(serverPath, {
        cwd: path.dirname(serverPath)
      });

      this.serverProcess.stdout.on('data', (data) => {
        if (data.includes('Server running on port 5244')) {
          resolve();
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error('服务器错误:', data.toString());
      });
    });
  }

  async showFallbackPage() {
    try {
      await this.mainWindow.loadFile(FALLBACK_PAGE);
      this.mainWindow.show();
    } catch (err) {
      console.error('加载备用页面失败:', err);
      this.mainWindow.show();
      this.mainWindow.webContents.send('fallback-error', {
        message: '无法加载任何内容',
        retryAvailable: false
      });
    }
  }

  setupIPC() {
    // 扩展管理
    ipcMain.handle('extensions:list', () => this.extensionManager.getExtensionsList());
    ipcMain.handle('extensions:install', (_, path) => this.extensionManager.installExtension(path));
    ipcMain.handle('extensions:remove', (_, id) => this.extensionManager.removeExtension(id));
    ipcMain.handle('extensions:open-dialog', this.handleOpenDialog.bind(this));

    // 网络控制
    ipcMain.handle('network:retry', this.tryConnectServer.bind(this));
    ipcMain.handle('network:check', this.checkServerStatus.bind(this));

    // 开发者工具
    ipcMain.on('devtools:open', () => {
      if (this.mainWindow) {
        this.mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
    });
  }

  async handleOpenDialog() {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择扩展目录'
    });
    return canceled ? null : filePaths[0];
  }
}

// 应用启动逻辑
async function initializeApp() {
  const myApp = new MainApplication();
  
  app.whenReady().then(async () => {
    myApp.setupIPC();
    await myApp.createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        myApp.createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      if (myApp.serverProcess) {
        myApp.serverProcess.kill();
      }
      app.quit();
    }
  });

  // 强制退出处理
  process.on('SIGTERM', () => {
    if (myApp.serverProcess) {
      myApp.serverProcess.kill('SIGTERM');
    }
    app.quit();
  });
}

initializeApp().catch(console.error);
