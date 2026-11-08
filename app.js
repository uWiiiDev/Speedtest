(() => {
    const statusLabel = document.getElementById('status-label');
    const speedValueEl = document.getElementById('speed-value');
    const speedUnitEl = document.getElementById('speed-unit');
    const restartBtn = document.getElementById('restart-btn');
    const progressBar = document.getElementById('progress-bar');
    const moreInfoBtn = document.getElementById('more-info-btn');
    const detailsPanel = document.getElementById('details-panel');
    const themeToggle = document.getElementById('theme-toggle');

    const pingUnloadedEl = document.getElementById('ping-unloaded');
    const pingLoadedEl = document.getElementById('ping-loaded');
    const pingJitterEl = document.getElementById('ping-jitter');
    const uploadValueEl = document.getElementById('upload-value');
    const uploadUnitEl = document.getElementById('upload-unit');
    const clientIpEl = document.getElementById('client-ip');
    const serverInfoEl = document.getElementById('server-info');
    const dataVolumeEl = document.getElementById('data-volume');

    let currentAbortController = null;
    let isRunning = false;
    let totalDownloadBytes = 0;
    let totalUploadBytes = 0;

    // Theme Initialization
    const savedTheme = localStorage.getItem('fast-intranet-theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const nextTheme = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('fast-intranet-theme', nextTheme);
    });

    moreInfoBtn.addEventListener('click', () => {
        const isHidden = detailsPanel.hasAttribute('hidden');
        if (isHidden) {
            detailsPanel.removeAttribute('hidden');
            moreInfoBtn.textContent = 'Weniger Informationen anzeigen';
        } else {
            detailsPanel.setAttribute('hidden', '');
            moreInfoBtn.textContent = 'Mehr Informationen anzeigen';
        }
    });

    restartBtn.addEventListener('click', () => {
        startTest();
    });

    function formatSpeed(mbps) {
        if (!Number.isFinite(mbps) || mbps <= 0) {
            return { value: '0', unit: 'Mbit/s' };
        }
        if (mbps < 1) {
            return { value: Math.round(mbps * 1000).toString(), unit: 'Kbit/s' };
        }
        if (mbps < 10) {
            return { value: mbps.toFixed(1), unit: 'Mbit/s' };
        }
        if (mbps < 100) {
            return { value: Math.round(mbps).toString(), unit: 'Mbit/s' };
        }
        return { value: Math.round(mbps).toString(), unit: 'Mbit/s' };
    }

    function updateVolumeDisplay() {
        const downMb = (totalDownloadBytes / (1024 * 1024)).toFixed(1);
        const upMb = (totalUploadBytes / (1024 * 1024)).toFixed(1);
        dataVolumeEl.textContent = `${downMb} MB ↓ / ${upMb} MB ↑`;
    }

    async function loadNetworkInfo() {
        try {
            const res = await fetch('api.php?action=info', { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            clientIpEl.textContent = data.clientIp || 'Unbekannt';
            const host = data.serverName || 'Server';
            const ip = data.serverIp ? ` (${data.serverIp})` : '';
            serverInfoEl.textContent = `${host}${ip}`;
        } catch {
            clientIpEl.textContent = 'Lokal';
            serverInfoEl.textContent = window.location.host;
        }
    }

    async function measureSinglePing(signal) {
        const t0 = performance.now();
        await fetch(`api.php?action=ping&_=${Math.random()}`, {
            cache: 'no-store',
            signal
        });
        return performance.now() - t0;
    }

    async function runPingPhase(signal) {
        const samples = [];
        // 1 Warmup request
        await measureSinglePing(signal);

        const count = 8;
        for (let i = 0; i < count; i++) {
            const rtt = await measureSinglePing(signal);
            samples.push(rtt);
            const minPing = Math.min(...samples);
            pingUnloadedEl.textContent = minPing < 1 ? '<1' : Math.round(minPing).toString();
        }

        // Calculate jitter (mean absolute difference between consecutive samples)
        let jitterSum = 0;
        for (let i = 1; i < samples.length; i++) {
            jitterSum += Math.abs(samples[i] - samples[i - 1]);
        }
        const jitter = samples.length > 1 ? jitterSum / (samples.length - 1) : 0;
        pingJitterEl.textContent = jitter < 1 ? '<1' : jitter.toFixed(1);
    }

    async function runDownloadPhase(signal, durationMs = 6500) {
        const concurrency = 3;
        const startTime = performance.now();
        let activeBytes = 0;
        let smoothedMbps = 0;
        const loadedPings = [];

        // Background loaded latency probe while download saturates link
        const pingLoop = (async () => {
            while (performance.now() - startTime < durationMs && !signal.aborted) {
                try {
                    const rtt = await measureSinglePing(signal);
                    loadedPings.push(rtt);
                    const avgLoaded = loadedPings.reduce((a, b) => a + b, 0) / loadedPings.length;
                    pingLoadedEl.textContent = avgLoaded < 1 ? '<1' : Math.round(avgLoaded).toString();
                    await new Promise(r => setTimeout(r, 350));
                } catch {
                    break;
                }
            }
        })();

        // Parallel stream workers
        const workers = Array.from({ length: concurrency }, async (_, workerIdx) => {
            while (performance.now() - startTime < durationMs && !signal.aborted) {
                try {
                    const res = await fetch(`api.php?action=download&chunks=64&w=${workerIdx}&_=${Math.random()}`, {
                        cache: 'no-store',
                        signal
                    });
                    if (!res.body) break;
                    const reader = res.body.getReader();
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done || signal.aborted) break;
                        if (value) {
                            activeBytes += value.byteLength;
                            totalDownloadBytes += value.byteLength;
                        }
                        if (performance.now() - startTime >= durationMs) {
                            reader.cancel().catch(() => {});
                            break;
                        }
                    }
                } catch {
                    break;
                }
            }
        });

        // UI update interval
        const uiTimer = setInterval(() => {
            const elapsedSec = (performance.now() - startTime) / 1000;
            if (elapsedSec <= 0.08) return;

            const currentMbps = (activeBytes * 8) / (elapsedSec * 1_000_000);
            smoothedMbps = smoothedMbps === 0 ? currentMbps : smoothedMbps * 0.65 + currentMbps * 0.35;

            const formatted = formatSpeed(smoothedMbps);
            speedValueEl.textContent = formatted.value;
            speedUnitEl.textContent = formatted.unit;

            const progress = Math.min(72, (elapsedSec / (durationMs / 1000)) * 72);
            progressBar.style.width = `${progress}%`;
            updateVolumeDisplay();
        }, 120);

        try {
            await Promise.all([...workers, pingLoop]);
        } finally {
            clearInterval(uiTimer);
        }

        const totalElapsedSec = Math.max(0.1, (performance.now() - startTime) / 1000);
        const finalMbps = (activeBytes * 8) / (totalElapsedSec * 1_000_000);
        return smoothedMbps > 0 ? (smoothedMbps * 0.4 + finalMbps * 0.6) : finalMbps;
    }

    async function runUploadPhase(signal, durationMs = 4000) {
        const concurrency = 2;
        const startTime = performance.now();
        let uploadedBytes = 0;
        let smoothedMbps = 0;

        // Create 1 MB payload buffer once (keeps requests well below PHP's default 8M post_max_size)
        const payload = new Uint8Array(1024 * 1024);
        for (let i = 0; i < payload.length; i += 4096) {
            payload[i] = i & 0xff;
        }

        const workers = Array.from({ length: concurrency }, async (_, workerIdx) => {
            while (performance.now() - startTime < durationMs && !signal.aborted) {
                try {
                    const res = await fetch(`api.php?action=upload&w=${workerIdx}&_=${Math.random()}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/octet-stream' },
                        body: payload,
                        cache: 'no-store',
                        signal
                    });
                    if (!res.ok) break;
                    uploadedBytes += payload.byteLength;
                    totalUploadBytes += payload.byteLength;
                } catch {
                    break;
                }
            }
        });

        const uiTimer = setInterval(() => {
            const elapsedSec = (performance.now() - startTime) / 1000;
            if (elapsedSec <= 0.08) return;

            const currentMbps = (uploadedBytes * 8) / (elapsedSec * 1_000_000);
            smoothedMbps = smoothedMbps === 0 ? currentMbps : smoothedMbps * 0.65 + currentMbps * 0.35;

            const formatted = formatSpeed(smoothedMbps);
            uploadValueEl.textContent = formatted.value;
            uploadUnitEl.textContent = formatted.unit;

            const progress = 72 + Math.min(28, (elapsedSec / (durationMs / 1000)) * 28);
            progressBar.style.width = `${progress}%`;
            updateVolumeDisplay();
        }, 120);

        try {
            await Promise.all(workers);
        } finally {
            clearInterval(uiTimer);
        }

        const totalElapsedSec = Math.max(0.1, (performance.now() - startTime) / 1000);
        const finalMbps = (uploadedBytes * 8) / (totalElapsedSec * 1_000_000);
        return smoothedMbps > 0 ? (smoothedMbps * 0.4 + finalMbps * 0.6) : finalMbps;
    }

    async function startTest() {
        if (currentAbortController) {
            currentAbortController.abort();
        }
        const controller = new AbortController();
        currentAbortController = controller;
        const { signal } = controller;

        isRunning = true;
        totalDownloadBytes = 0;
        totalUploadBytes = 0;
        updateVolumeDisplay();

        // Reset UI state
        statusLabel.textContent = 'Ihre Netzwerkgeschwindigkeit wird ermittelt …';
        speedValueEl.textContent = '0';
        speedUnitEl.textContent = 'Mbit/s';
        speedValueEl.classList.add('testing');
        restartBtn.classList.add('spinning');
        progressBar.classList.remove('done');
        progressBar.style.width = '4%';

        pingUnloadedEl.textContent = '–';
        pingLoadedEl.textContent = '–';
        pingJitterEl.textContent = '–';
        uploadValueEl.textContent = '–';
        uploadUnitEl.textContent = 'Mbit/s';

        try {
            // 1. Ping & Jitter
            await runPingPhase(signal);
            if (signal.aborted) return;
            progressBar.style.width = '12%';

            // 2. Download Speed
            const finalDownMbps = await runDownloadPhase(signal, 6000);
            if (signal.aborted) return;

            const downFormatted = formatSpeed(finalDownMbps);
            speedValueEl.textContent = downFormatted.value;
            speedUnitEl.textContent = downFormatted.unit;
            speedValueEl.classList.remove('testing');
            moreInfoBtn.removeAttribute('hidden');

            // 3. Upload Speed
            statusLabel.textContent = 'Upload-Geschwindigkeit wird gemessen …';
            const finalUpMbps = await runUploadPhase(signal, 3500);
            if (signal.aborted) return;

            const upFormatted = formatSpeed(finalUpMbps);
            uploadValueEl.textContent = upFormatted.value;
            uploadUnitEl.textContent = upFormatted.unit;
            updateVolumeDisplay();

            // Done
            statusLabel.textContent = 'Ihre Intranet-Geschwindigkeit beträgt';
            progressBar.style.width = '100%';
            progressBar.classList.add('done');
            restartBtn.classList.remove('spinning');
            isRunning = false;
        } catch (err) {
            if (!signal.aborted) {
                statusLabel.textContent = 'Verbindungsfehler beim Speedtest';
                speedValueEl.classList.remove('testing');
                restartBtn.classList.remove('spinning');
                isRunning = false;
            }
        }
    }

    loadNetworkInfo();
    startTest();
})();
