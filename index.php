<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FAST Intranet Speedtest</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header class="top-bar">
        <div class="logo" aria-label="FAST Intranet Speedtest">
            <svg class="logo-icon" viewBox="0 0 64 64" width="38" height="38" aria-hidden="true">
                <path d="M32 8a24 24 0 0 0-20.78 36l3.46-2a20 20 0 1 1 34.64 0l3.46 2A24 24 0 0 0 32 8z" fill="currentColor" opacity="0.25"/>
                <path d="M32 8a24 24 0 0 1 20.78 36l-3.46-2A20 20 0 0 0 14.68 22l-3.46-2A24 24 0 0 1 32 8z" fill="#e50914"/>
                <circle cx="32" cy="36" r="4.5" fill="#e50914"/>
                <path d="M32 36L46 20" stroke="#e50914" stroke-width="4" stroke-linecap="round"/>
            </svg>
            <span class="logo-text">FAST</span>
            <span class="logo-badge">INTRANET</span>
        </div>

        <button id="theme-toggle" class="icon-btn" title="Darstellung wechseln (Hell/Dunkel)" aria-label="Darstellung wechseln">
            <svg class="icon-moon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
            <svg class="icon-sun" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
        </button>
    </header>

    <main class="speedtest-container">
        <p id="status-label" class="status-label">Ihre Netzwerkgeschwindigkeit wird ermittelt …</p>

        <div class="primary-metric">
            <div id="speed-value" class="speed-value testing" aria-live="polite">0</div>
            <div class="speed-side">
                <div id="speed-unit" class="speed-unit">Mbit/s</div>
                <button id="restart-btn" class="restart-btn spinning" title="Test neu starten" aria-label="Test neu starten">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                </button>
            </div>
        </div>

        <div class="progress-track" aria-hidden="true">
            <div id="progress-bar" class="progress-bar"></div>
        </div>

        <div class="more-info-Toggle-wrap">
            <button id="more-info-btn" class="more-info-btn" hidden>
                Mehr Informationen anzeigen
            </button>
        </div>

        <section id="details-panel" class="details-panel" hidden>
            <div class="details-grid">
                <div class="detail-group">
                    <h3>Latenz</h3>
                    <div class="detail-columns">
                        <div class="detail-item">
                            <span class="detail-sublabel">Unbelastet</span>
                            <div class="detail-metric">
                                <span id="ping-unloaded" class="detail-number">–</span>
                                <span class="detail-unit">ms</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <span class="detail-sublabel">Belastet</span>
                            <div class="detail-metric">
                                <span id="ping-loaded" class="detail-number">–</span>
                                <span class="detail-unit">ms</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <span class="detail-sublabel">Jitter</span>
                            <div class="detail-metric">
                                <span id="ping-jitter" class="detail-number">–</span>
                                <span class="detail-unit">ms</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="detail-group">
                    <h3>Upload</h3>
                    <div class="detail-columns">
                        <div class="detail-item">
                            <span class="detail-sublabel">Geschwindigkeit</span>
                            <div class="detail-metric">
                                <span id="upload-value" class="detail-number">–</span>
                                <span id="upload-unit" class="detail-unit">Mbit/s</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="network-meta">
                <div class="meta-item">
                    <span class="meta-label">Client</span>
                    <span id="client-ip" class="meta-val">…</span>
                </div>
                <span class="meta-sep">•</span>
                <div class="meta-item">
                    <span class="meta-label">Server</span>
                    <span id="server-info" class="meta-val">…</span>
                </div>
                <span class="meta-sep">•</span>
                <div class="meta-item">
                    <span class="meta-label">Datenvolumen</span>
                    <span id="data-volume" class="meta-val">0 MB ↓ / 0 MB ↑</span>
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <span>Lokaler Intranet-Speedtest • Keine externen Verbindungen</span>
    </footer>

    <script src="app.js"></script>
</body>
</html>
