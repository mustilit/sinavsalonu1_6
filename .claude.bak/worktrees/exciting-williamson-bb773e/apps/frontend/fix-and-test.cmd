@echo off
echo Removing node_modules...
if exist node_modules rmdir /s /q node_modules
echo Removing package-lock.json...
if exist package-lock.json del package-lock.json
echo Running npm install...
call npm install
if errorlevel 1 (
  echo npm install failed
  exit /b 1
)
echo Running tests...
call npm run test:run
exit /b 0
