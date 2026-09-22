@echo off

cd /d C:\laragon\www\gmao-cns-v2\backend

C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe artisan schedule:work

pause