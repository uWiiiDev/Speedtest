#!/usr/bin/env bash
# ==============================================================================
# FAST Intranet Speedtest - Debian/Ubuntu (.deb) Package Builder
# Erstellt ein installierbares .deb-Paket inkl. Systemd-Service (/opt/speedtest)
# auf Port 8080 (konfigurierbar in /etc/default/intranet-speedtest).
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
VERSION="$(tr -d '[:space:]' < "${PROJECT_ROOT}/VERSION")"
PKG_NAME="intranet-speedtest"
ARCH="all"
BUILD_ROOT="${PROJECT_ROOT}/packaging/build/${PKG_NAME}_${VERSION}_${ARCH}"
OUTPUT_DEB="${PROJECT_ROOT}/${PKG_NAME}_${VERSION}_${ARCH}.deb"

echo "==> Baue Debian-Paket: ${PKG_NAME}_${VERSION}_${ARCH}.deb ..."

rm -rf "${PROJECT_ROOT}/packaging/build"
rm -f "${PROJECT_ROOT}/${PKG_NAME}_"*_"${ARCH}.deb"
mkdir -p "${BUILD_ROOT}/DEBIAN"
mkdir -p "${BUILD_ROOT}/opt/speedtest"
mkdir -p "${BUILD_ROOT}/etc/default"
mkdir -p "${BUILD_ROOT}/lib/systemd/system"
mkdir -p "${BUILD_ROOT}/usr/bin"

# 1. Anwendungsdateien nach /opt/speedtest kopieren
cp "${PROJECT_ROOT}/index.php"  "${BUILD_ROOT}/opt/speedtest/"
cp "${PROJECT_ROOT}/api.php"    "${BUILD_ROOT}/opt/speedtest/"
cp "${PROJECT_ROOT}/app.js"     "${BUILD_ROOT}/opt/speedtest/"
cp "${PROJECT_ROOT}/style.css"  "${BUILD_ROOT}/opt/speedtest/"
cp "${PROJECT_ROOT}/README.md"  "${BUILD_ROOT}/opt/speedtest/"
cp "${PROJECT_ROOT}/VERSION"    "${BUILD_ROOT}/opt/speedtest/"

# 2. Konfigurationsdatei /etc/default/intranet-speedtest
cat << 'EOF' > "${BUILD_ROOT}/etc/default/intranet-speedtest"
# FAST Intranet Speedtest Server-Konfiguration
# Standard-Port für die Weboberfläche (8080 kollidiert nicht mit NetworkMonitor auf 8085)
PORT=8080

# Bind-Adresse ([::0] = Dual-Stack IPv4 + IPv6 im gesamten LAN & über VPN erreichbar)
BIND_ADDR=[::0]
EOF
chmod 0644 "${BUILD_ROOT}/etc/default/intranet-speedtest"

# 3. Systemd-Service (/lib/systemd/system/intranet-speedtest.service)
cat << 'EOF' > "${BUILD_ROOT}/lib/systemd/system/intranet-speedtest.service"
[Unit]
Description=FAST Intranet Speedtest Web Server
After=network.target

[Service]
Type=simple
Environment="PHP_CLI_SERVER_WORKERS=6"
EnvironmentFile=-/etc/default/intranet-speedtest
WorkingDirectory=/opt/speedtest
ExecStart=/bin/sh -c 'exec /usr/bin/php -d expose_php=0 -S ${BIND_ADDR:-0.0.0.0}:${PORT:-8080} -t /opt/speedtest'
Restart=always
RestartSec=3
User=www-data
Group=www-data
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
chmod 0644 "${BUILD_ROOT}/lib/systemd/system/intranet-speedtest.service"

# 4. CLI-Befehl (/usr/bin/intranet-speedtest)
cat << 'EOF' > "${BUILD_ROOT}/usr/bin/intranet-speedtest"
#!/usr/bin/env bash
PORT=8080
if [ -f /etc/default/intranet-speedtest ]; then
    . /etc/default/intranet-speedtest
fi
URL="http://127.0.0.1:${PORT}"

case "${1:-status}" in
    status)
        echo "Intranet Speedtest URL: $URL"
        systemctl status intranet-speedtest.service --no-pager || true
        ;;
    restart)
        sudo systemctl restart intranet-speedtest.service
        echo "Intranet Speedtest neu gestartet ($URL)."
        ;;
    *)
        echo "Verwendung: intranet-speedtest [status|restart]"
        ;;
esac
EOF
chmod 0755 "${BUILD_ROOT}/usr/bin/intranet-speedtest"

# 5. DEBIAN/conffiles
cat << 'EOF' > "${BUILD_ROOT}/DEBIAN/conffiles"
/etc/default/intranet-speedtest
EOF
chmod 0644 "${BUILD_ROOT}/DEBIAN/conffiles"

# 6. DEBIAN/control
INSTALLED_SIZE="$(du -sk "${BUILD_ROOT}" | cut -f1)"
cat << EOF > "${BUILD_ROOT}/DEBIAN/control"
Package: ${PKG_NAME}
Version: ${VERSION}
Section: net
Priority: optional
Architecture: ${ARCH}
Installed-Size: ${INSTALLED_SIZE}
Depends: php-cli | php5-cli
Maintainer: uWiiiDev <https://github.com/uWiiiDev/Speedtest>
Homepage: https://github.com/uWiiiDev/Speedtest
Description: Minimalistischer Intranet-Speedtest im Stil von fast.com
 Eigenständiger PHP-Speedtest-Server für das lokale Netzwerk (LAN/WLAN/VPN)
 mit Echtzeit-Download-, Upload-, Ping- und Jitter-Messung auf Port 8080.
EOF
chmod 0644 "${BUILD_ROOT}/DEBIAN/control"

# 7. DEBIAN/postinst
cat << 'EOF' > "${BUILD_ROOT}/DEBIAN/postinst"
#!/bin/sh
set -e

if command -v systemctl >/dev/null 2>&1; then
    systemctl daemon-reload >/dev/null 2>&1 || true
    systemctl enable intranet-speedtest.service >/dev/null 2>&1 || true
    systemctl restart intranet-speedtest.service >/dev/null 2>&1 || true
fi

if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
    ufw allow from 192.168.0.0/16 to any port 8080 proto tcp comment "Intranet Speedtest LAN IPv4" >/dev/null 2>&1 || true
    ufw allow from 10.0.0.0/8 to any port 8080 proto tcp comment "Intranet Speedtest VPN/LAN 10.x" >/dev/null 2>&1 || true
    ufw allow from 172.16.0.0/12 to any port 8080 proto tcp comment "Intranet Speedtest LAN 172.16.x" >/dev/null 2>&1 || true
    ufw allow from fd00::/8 to any port 8080 proto tcp comment "Intranet Speedtest LAN IPv6 ULA" >/dev/null 2>&1 || true
    ufw allow from fe80::/10 to any port 8080 proto tcp comment "Intranet Speedtest LAN IPv6 Link-Local" >/dev/null 2>&1 || true
fi

echo "======================================================================"
echo " FAST Intranet Speedtest wurde erfolgreich installiert!"
echo " -> Weboberfläche: http://<SERVER-IP>:8080"
echo " -> Konfiguration: /etc/default/intranet-speedtest"
echo "======================================================================"
exit 0
EOF
chmod 0755 "${BUILD_ROOT}/DEBIAN/postinst"

# 8. DEBIAN/prerm
cat << 'EOF' > "${BUILD_ROOT}/DEBIAN/prerm"
#!/bin/sh
set -e
if command -v systemctl >/dev/null 2>&1; then
    systemctl stop intranet-speedtest.service >/dev/null 2>&1 || true
    systemctl disable intranet-speedtest.service >/dev/null 2>&1 || true
fi
exit 0
EOF
chmod 0755 "${BUILD_ROOT}/DEBIAN/prerm"

dpkg-deb --build --root-owner-group "${BUILD_ROOT}" "${OUTPUT_DEB}"
rm -rf "${PROJECT_ROOT}/packaging/build"
echo "==> Fertig: ${OUTPUT_DEB}"
