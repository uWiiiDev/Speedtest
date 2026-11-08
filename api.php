<?php
declare(strict_types=1);

// Prevent caching on all API endpoints
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: 0');

$action = $_GET['action'] ?? 'ping';

switch ($action) {
    case 'ping':
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['pong' => microtime(true)]);
        break;

    case 'info':
        header('Content-Type: application/json; charset=utf-8');
        $clientIp = $_SERVER['REMOTE_ADDR'] ?? 'Unbekannt';
        $serverName = gethostname() ?: ($_SERVER['SERVER_NAME'] ?? 'Localhost');
        $hostHeader = isset($_SERVER['HTTP_HOST']) ? explode(':', $_SERVER['HTTP_HOST'])[0] : '';
        $serverIp = $_SERVER['SERVER_ADDR'] ?? ($hostHeader ?: gethostbyname($serverName));
        $serverPort = $_SERVER['SERVER_PORT'] ?? '';

        echo json_encode([
            'clientIp' => $clientIp,
            'serverName' => $serverName,
            'serverIp' => $serverIp,
            'serverPort' => $serverPort,
        ]);
        break;

    case 'download':
        // Allow long running stream and stop immediately if client aborts
        @set_time_limit(0);
        ignore_user_abort(false);

        // Disable compression so random data isn't buffered/compressed by web server
        if (function_exists('apache_setenv')) {
            @apache_setenv('no-gzip', '1');
        }
        @ini_set('zlib.output_compression', 'Off');
        @ini_set('output_buffering', 'Off');
        @ini_set('implicit_flush', '1');

        while (ob_get_level() > 0) {
            @ob_end_clean();
        }
        ob_implicit_flush(true);

        header('Content-Type: application/octet-stream');
        header('Content-Encoding: identity');
        header('X-Accel-Buffering: no'); // Disable Nginx buffering if behind Nginx

        // Number of 1 MB chunks to send in this stream (default 64 MB per request, clamped 1..256)
        $chunks = isset($_GET['chunks']) ? max(1, min(256, (int)$_GET['chunks'])) : 64;

        // Generate 1 MB of uncompressible pseudo-random data in RAM once
        $chunkSize = 1048576; // 1 MB
        $data = random_bytes($chunkSize);

        for ($i = 0; $i < $chunks; $i++) {
            if (connection_aborted()) {
                break;
            }
            echo $data;
            flush();
        }
        break;

    case 'upload':
        @set_time_limit(30);
        header('Content-Type: application/json; charset=utf-8');

        // Read raw input stream and discard immediately to minimize memory usage
        $input = fopen('php://input', 'rb');
        $bytesReceived = 0;
        if ($input) {
            while (!feof($input)) {
                $chunk = fread($input, 65536);
                if ($chunk === false) {
                    break;
                }
                $bytesReceived += strlen($chunk);
            }
            fclose($input);
        }

        echo json_encode([
            'received' => $bytesReceived,
            'timestamp' => microtime(true),
        ]);
        break;

    default:
        http_response_code(400);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Ungültige Aktion']);
        break;
}
