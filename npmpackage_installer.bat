@echo off
:: ��鲢��ȡ����ԱȨ��
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo �������ԱȨ��...
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

:: ����װ����
echo.
echo ============================================
echo �����Թ���Ա��ݰ�װ Electron ��������
echo ============================================
echo.

:: ��ʾ��ǰnode��npm�汾
echo ��ǰNode.js�汾:
node -v
echo ��ǰnpm�汾:
npm -v
echo.

:: ��װElectron��electron-builder
echo ���ڰ�װElectron��electron-builder...
npm install electron electron-builder --save-dev --verbose
echo.


echo.
echo ============================================
echo ��װ��ɣ�
echo ��������:
echo   npm start    - ��������ģʽ
echo   npm run pack - ���Ӧ��(�����ɰ�װ��)
echo   npm run dist - ����������װ��
echo   npm start    - ����ģʽ����
echo.
echo �������:
echo   - Ĭ�����Ŀ¼: ./dist
echo ============================================
echo.
pause

