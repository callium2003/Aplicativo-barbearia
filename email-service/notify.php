<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $body): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

function smtpRead($socket): string {
    $response = '';
    while (($line = fgets($socket, 1024)) !== false) {
        $response .= $line;
        if (preg_match('/^\d{3} /', $line)) return $response;
    }
    throw new RuntimeException('SMTP não respondeu.');
}

function smtpCommand($socket, string $command, array $expected): string {
    fwrite($socket, $command . "\r\n");
    $response = smtpRead($socket);
    $code = (int) substr($response, 0, 3);
    if (!in_array($code, $expected, true)) throw new RuntimeException('Falha SMTP: ' . trim($response));
    return $response;
}

function smtpSend(array $config, string $recipient, string $subject, string $html): void {
    $socket = stream_socket_client(
        'ssl://' . $config['smtp_host'] . ':' . $config['smtp_port'],
        $errno,
        $error,
        20,
        STREAM_CLIENT_CONNECT
    );
    if ($socket === false) throw new RuntimeException('Não foi possível conectar ao SMTP: ' . $error);
    stream_set_timeout($socket, 20);
    try {
        smtpRead($socket);
        smtpCommand($socket, 'EHLO barbeariasp', [250]);
        smtpCommand($socket, 'AUTH LOGIN', [334]);
        smtpCommand($socket, base64_encode($config['smtp_username']), [334]);
        smtpCommand($socket, base64_encode($config['smtp_password']), [235]);
        smtpCommand($socket, 'MAIL FROM:<' . $config['from_email'] . '>', [250]);
        smtpCommand($socket, 'RCPT TO:<' . $recipient . '>', [250, 251]);
        smtpCommand($socket, 'DATA', [354]);
        $headers = [
            'From: ' . $config['from_name'] . ' <' . $config['from_email'] . '>',
            'To: <' . $recipient . '>',
            'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=',
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
        ];
        smtpCommand($socket, implode("\r\n", $headers) . "\r\n\r\n" . $html . "\r\n.", [250]);
        smtpCommand($socket, 'QUIT', [221]);
    } finally {
        fclose($socket);
    }
}

function updateOutbox(array $config, string $id, string $status, ?string $error = null): void {
    $url = rtrim($config['supabase_url'], '/') . '/rest/v1/notification_outbox?id=eq.' . rawurlencode($id);
    $payload = json_encode(['status' => $status, 'attempts' => $status === 'sent' ? 1 : 1, 'sent_at' => $status === 'sent' ? gmdate('c') : null, 'last_error' => $error], JSON_UNESCAPED_UNICODE);
    $request = curl_init($url);
    curl_setopt_array($request, [
        CURLOPT_CUSTOMREQUEST => 'PATCH', CURLOPT_POSTFIELDS => $payload, CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['apikey: ' . $config['supabase_service_role_key'], 'Authorization: Bearer ' . $config['supabase_service_role_key'], 'Content-Type: application/json'],
    ]);
    curl_exec($request);
    curl_close($request);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(405, ['error' => 'Método não permitido']);
// Em produção, notify.php fica em public_html/barbeariasp e a configuração
// fica em private/config.php, fora de public_html.
$configPath = __DIR__ . '/../../private/config.php';
if (!is_file($configPath)) respond(503, ['error' => 'Serviço não configurado']);
$config = require $configPath;
$raw = file_get_contents('php://input') ?: '';
$webhookSecret = $_SERVER['HTTP_X_BARBEARIASP_WEBHOOK_SECRET'] ?? '';
if (!hash_equals((string) $config['webhook_secret'], $webhookSecret)) {
    respond(401, ['error' => 'Chave do webhook inválida']);
}
$event = json_decode($raw, true);
$record = $event['record'] ?? $event;
if (!is_array($record) || ($record['kind'] ?? '') !== 'new_appointment' || ($record['status'] ?? '') !== 'pending') respond(400, ['error' => 'Evento inválido']);

$data = $record['payload'] ?? [];
$customer = htmlspecialchars((string)($data['customer_name'] ?? 'Cliente'), ENT_QUOTES, 'UTF-8');
$service = htmlspecialchars((string)($data['service'] ?? 'Serviço'), ENT_QUOTES, 'UTF-8');
$professional = htmlspecialchars((string)($data['professional'] ?? 'Profissional'), ENT_QUOTES, 'UTF-8');
$time = htmlspecialchars((string)($data['starts_at'] ?? ''), ENT_QUOTES, 'UTF-8');
$phone = htmlspecialchars((string)($data['customer_phone'] ?? ''), ENT_QUOTES, 'UTF-8');
$shop = htmlspecialchars((string)($data['barbershop_name'] ?? 'Barbearia'), ENT_QUOTES, 'UTF-8');
$subject = 'Novo agendamento — ' . $shop;
$html = "<h2>Novo agendamento</h2><p><b>Cliente:</b> {$customer}</p><p><b>Serviços:</b> {$service}</p><p><b>Profissional:</b> {$professional}</p><p><b>Data e horário:</b> {$time}</p><p><b>Celular:</b> {$phone}</p><p>Acesse a Agenda do BarbeariaSP para acompanhar.</p>";

try {
    smtpSend($config, (string)$record['recipient_email'], $subject, $html);
    updateOutbox($config, (string)$record['id'], 'sent');
    respond(200, ['ok' => true]);
} catch (Throwable $exception) {
    updateOutbox($config, (string)$record['id'], 'failed', substr($exception->getMessage(), 0, 500));
    respond(502, ['error' => 'Falha no envio']);
}
