const { app, BrowserWindow, session, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');

class ExtensionManager {
  constructor() {
    this.extensions = new Map();
    this.storagePath = path.join(app.getPath('userData'), 'extensions.json');
    this.loadExtensions();
    
    // 监控扩展目录变化
    chokidar.watch(this.getExtensionsDir()).on('all', () => {
      this.loadExtensions();
      this.sendUpdateToWindows();
    });
  }

  getExtensionsDir() {
    return app.isPackaged 
      ? path.join(process.resourcesPath, 'extensions')
      : path.join(__dirname, 'extensions');
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
    this.sendUpdateToWindows();
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
        enabled: true,
        manifest
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

  sendUpdateToWindows() {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(win => {
      win.webContents.send('extensions:updated', this.getExtensionsList());
    });
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

// 初始化应用
const extensionManager = new ExtensionManager();
let mainWindow;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true
    }
  });

  await mainWindow.loadFile('src/index.html');

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// IPC通信
ipcMain.handle('extensions:list', () => extensionManager.getExtensionsList());
ipcMain.handle('extensions:install', (_, path) => extensionManager.installExtension(path));
ipcMain.handle('extensions:remove', (_, id) => extensionManager.removeExtension(id));
ipcMain.handle('extensions:open-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择扩展目录'
  });
  return canceled ? null : filePaths[0];
});

ipcMain.on('extension:show-details', (_, id) => {
  const ext = extensionManager.extensions.get(id);
  if (!ext) return;

  const detailsWindow = new BrowserWindow({
    width: 600,
    height: 500,
    parent: mainWindow,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  detailsWindow.loadFile('src/details.html', {
    query: { id }
  });
});

// 应用生命周期
app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
