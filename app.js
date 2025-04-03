
document.addEventListener('DOMContentLoaded', () => {
    // 模拟扩展数据
    const extensions = [
        {
            name: 'Avoid将下载文件作为帮助',
            version: '0.0.3.3',
            status: '无法访问桌面',
            error: true,
            description: 'A 进行 修改或更新',
            id: 'cdfhelp@abdbconnectjihadipagegmflinke'
        },
        {
            name: 'AdGuard 下载至桌面',
            version: '4.4.50',
            status: 'page/background.html',
            description: '一款无机化的广告拦截工具，支持 Facebook、YouTube 和其它所有网站',
            id: 'pdflib.fedigmail.bgdrtools.hk1scgpkh'
        }
    ];

    const extensionsList = document.getElementById('extensionsList');
    const searchInput = document.getElementById('searchInput');
    const devModeCheckbox = document.getElementById('devMode');
    const devButtons = document.getElementById('devButtons');

    // 生成扩展列表
    function renderExtensions(filter = '') {
        extensionsList.innerHTML = extensions
            .filter(ext => ext.name.toLowerCase().includes(filter.toLowerCase()))
            .map(ext => `
                <div class="extension-item">
                    <div class="extension-header">
                        <span class="name">${ext.name} ${ext.version}</span>
                        <span class="status ${ext.error ? 'error' : ''}">检查桌面 ${ext.status}</span>
                    </div>
                    <p class="description">${ext.description}</p>
                    <div class="extension-meta">
                        <span class="id">ID ${ext.id}</span>
                        <div class="actions">
                            <button class="details">详细信息</button>
                            <button class="remove">删除</button>
                        </div>
                    </div>
                </div>
            `).join('');
    }

    // 搜索功能
    searchInput.addEventListener('input', (e) => {
        renderExtensions(e.target.value);
    });

    // 开发者模式切换
    devModeCheckbox.addEventListener('change', (e) => {
        devButtons.style.display = e.target.checked ? 'flex' : 'none';
    });

    // 初始渲染
    renderExtensions();
});