# Expose local backend (port 5000) to the internet so phones can scan QR off WiFi.
# Keep this window open while testing QR scans.

$port = 5000
Write-Host "Starting public tunnel to http://localhost:$port ..."
Write-Host "Keep this window open. Copy the https://....lhr.life URL into backend/.env PUBLIC_URL"
Write-Host ""

ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -R 80:localhost:$port nokey@localhost.run
