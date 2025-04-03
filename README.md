# 项目名称:Alist

### 使用说明

1. 安装依赖：

   ```bash
   npm install
   ```
2. 开发模式运行：

   ```bash
   npm start
   ```
3. 打包单文件 EXE：

   ```bash
   npm run dist
   ```
4. 打包后的 EXE 会输出到 `dist` 目录，数据存储逻辑会自动处理：

   - 便携版：同目录下的 `data` 文件夹
   - 安装版：`%APPDATA%\MyWebApp\data`
