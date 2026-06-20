@echo off
where.exe %* 2>nul
exit /b %ERRORLEVEL%
