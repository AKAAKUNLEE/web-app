@echo off
:: 检查并获取管理员权限
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo 请求管理员权限...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%CD%"
    CD /D "%~dp0"

:: 主安装过程
echo.
echo ============================================
echo 正在以管理员身份安装 Electron 开发环境
echo ============================================
echo.

:: 检查Node.js和npm是否安装
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: Node.js 未安装或未添加到系统PATH
    pause
    exit /b
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: npm 未安装或未添加到系统PATH
    pause
    exit /b
)

:: 显示当前node和npm版本
echo 当前Node.js版本:
node -v
echo 当前npm版本:
npm -v
echo.

:: 安装Electron和electron-builder
echo 正在安装Electron和electron-builder...
npm install electron electron-builder --save-dev --verbose
echo.

echo.
echo ============================================
echo 安装完成！
echo 可用命令:
echo   npm start    - 启动开发模式
echo   npm run pack - 打包应用(不生成安装包)
echo   npm run dist - 构建完整安装包
echo ============================================
echo.

pause
