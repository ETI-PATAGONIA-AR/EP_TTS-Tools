@echo off
cd /d "%~dp0"
echo ========================================
echo  EP_TTS TOOLS - ETI Patagonia v3.1
echo  Motor: edge-tts (Microsoft Neural)
echo  Voces: Argentina / Chile / Mexico / Uruguay
echo ========================================
echo.
if not exist "node_modules" call npm install --silent 2>nul
python -c "import edge_tts" 2>nul || (echo Detected: Instalando dependencias Python... && pip install -r requirements.txt)
echo Iniciando servidor...
start "EP_TTS" cmd /c "npm run dev"
timeout /t 3 /nobreak >nul
echo Abriendo Chrome en http://localhost:3000 ...
start "" http://localhost:3000
echo.
echo Servidor corriendo en http://localhost:3000
echo Cerra la ventana del servidor para detenerlo.
