document.addEventListener('DOMContentLoaded', async () => {
    const extensionsList = document.getElementById('extensionsList');
    const searchInput = document.getElementById('searchInput');
    const loadExtensionBtn = document.getElementById('loadExtension');
    const devModeCheckbox = document.getElementById('devMode');
  
    // 加载扩展数据
    let extensions = await window.electronAPI.getExtensions();
    renderExtensions(extensions);
  
    // 实时更新监听
    window.electronAPI.onExtensionsUpdated((updatedExtensions) => {
      extensions = updatedExtensions;
      renderExtensions(extensions);
    });
  
    // 渲染扩展列表
    function renderExtensions(extensions, filter = '') {
      const filtered = extensions.filter(ext => 
        ext.name.toLowerCase().includes(filter.toLowerCase()) || 
        ext.description.toLowerCase().includes(filter.toLowerCase())
      );
  
      extensionsList.innerHTML = filtered.map(ext => `
        <div class="extension-card" data-id="${ext.id}">
          <div class="extension-header">
            <h3>${ext.name}</h3>
            <span class="version">v${ext.version}</span>
            <span class="status ${ext.error ? 'error' : ''}">${ext.status}</span>
          </div>
          <p class="description">${ext.description || '无描述'}</p>
          <div class="extension-footer">
            <button class="btn-details" data-id="${ext.id}">详情</button>
            <button class="btn-remove" data-id="${ext.id}">移除</button>
          </div>
        </div>
      `).join('');
  
      // 添加事件监听
      document.querySelectorAll('.btn-details').forEach(btn => {
        btn.addEventListener('click', (e) => {
          window.electronAPI.showExtensionDetails(e.target.dataset.id);
        });
      });
  
      document.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          const ext = extensions.find(x => x.id === id);
          if (confirm(`确定要移除 "${ext.name}" 吗？`)) {
            const success = await window.electronAPI.removeExtension(id);
            if (success) {
              extensions = await window.electronAPI.getExtensions();
              renderExtensions(extensions, searchInput.value);
            }
          }
        });
      });
    }
  
    // 搜索功能
    searchInput.addEventListener('input', (e) => {
      renderExtensions(extensions, e.target.value);
    });
  
    // 加载扩展
    loadExtensionBtn.addEventListener('click', async () => {
      const extPath = await window.electronAPI.openExtensionDialog();
      if (extPath) {
        const result = await window.electronAPI.installExtension(extPath);
        if (!result.success) {
          alert(`安装失败: ${result.error}`);
        }
      }
    });
  
    // 开发者模式
    devModeCheckbox.addEventListener('change', (e) => {
      document.body.classList.toggle('dev-mode', e.target.checked);
    });
  });
  