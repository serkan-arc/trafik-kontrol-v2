<?php
// CORS headers - İzin verilen domainler
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// OPTIONS request için (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Sadece POST isteklerini kabul et
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Sadece POST istekleri kabul edilir'
    ]);
    exit();
}

// N8N Webhook URL'i - Kendi N8N webhook URL'inizi buraya ekleyin
$n8n_webhook_url = 'YOUR_N8N_WEBHOOK_URL_HERE';

// Eğer N8N URL henüz ayarlanmadıysa test modunda çalış
if ($n8n_webhook_url === 'YOUR_N8N_WEBHOOK_URL_HERE') {
    // Test modu - gerçek API çağrısı yapmadan başarılı yanıt döndür
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Sipariş başarıyla alındı (Test Modu)',
        'order_id' => 'TEST_' . time(),
        'note' => 'N8N webhook URL henüz ayarlanmadı. Gerçek sipariş gönderilemedi.'
    ]);
    exit();
}

// POST verisini al
$post_data = file_get_contents('php://input');
$order_data = json_decode($post_data, true);

// Veri validasyonu
if (!$order_data || !isset($order_data['first_name']) || !isset($order_data['last_name']) || !isset($order_data['phone'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Eksik form verileri'
    ]);
    exit();
}

// Ek bilgiler ekle
$order_data['server_timestamp'] = date('Y-m-d H:i:s');
$order_data['server_ip'] = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$order_data['user_agent'] = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

// N8N webhook'a gönder
$ch = curl_init($n8n_webhook_url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($order_data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

// Hata kontrolü
if ($curl_error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Webhook bağlantı hatası: ' . $curl_error
    ]);
    exit();
}

if ($http_code >= 200 && $http_code < 300) {
    // Başarılı
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Sipariş başarıyla alındı',
        'order_id' => 'ORD_' . time(),
        'webhook_response' => $response
    ]);
} else {
    // Hata
    http_response_code($http_code);
    echo json_encode([
        'success' => false,
        'error' => 'N8N webhook hatası',
        'http_code' => $http_code,
        'response' => $response
    ]);
}
?>
