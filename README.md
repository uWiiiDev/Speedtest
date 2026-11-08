# FAST Intranet Speedtest (PHP)

Eine minimalistische, selbstgehostete Speedtest-Webanwendung im Stil von **fast.com** – speziell entwickelt für das lokale Netzwerk (Intranet / LAN / WLAN) auf Basis von **PHP** und **Vanilla JavaScript**.

## Features

- **100 % Intranet- & Offline-fähig:** Keine externen Abhängigkeiten, keine CDNs, keine Datenbank erforderlich.
- **Fast.com-Design:** Startet sofort beim Aufruf mit großer Echtzeit-Geschwindigkeitsanzeige sowie Hell-/Dunkel-Modus.
- **Umfassende Messwerte:**
  - **Download-Geschwindigkeit** (parallele Streams mit unkomprimierbaren Zufallsdaten im RAM)
  - **Upload-Geschwindigkeit** (Streaming-Upload an `php://input` ohne Festplatten-I/O)
  - **Latenz (Ping):** Unbelastet, Belastet (Bufferbloat-Messung) & Jitter in Millisekunden
  - **Netzwerk-Infos:** Client-IP, Server-Hostname/IP und übertragenes Datenvolumen

## Installation & Start

### 1. Mit integriertem PHP-Entwicklungsserver (zum schnellen Testen im LAN)
```bash
php -S 0.0.0.0:8080
```
Anschließend im Browser (auch von anderen Geräten im Intranet) über `http://<SERVER-IP>:8080` aufrufen.

### 2. Mit Apache / Nginx + PHP-FPM
Einfach alle Dateien (`index.php`, `api.php`, `style.css`, `app.js`) in ein Verzeichnis des Webservers kopieren. Es wird ab **PHP 7.4+** / **PHP 8.x** ohne zusätzliche Extensions unterstützt.

## Projektstruktur

- `index.php` – Oberfläche im fast.com-Stil
- `api.php` – PHP-Endpunkte für Ping, Download-Stream, Upload-Empfang und Server-Info
- `app.js` – Parallele Streaming-Messlogik (`ReadableStream` + `AbortController`)
- `style.css` – Responsives Styling inkl. Dark Mode
