<?php
// api/upload.php - Upload receipt/invoice file. Auth required.
declare(strict_types=1);

require __DIR__ . "/config.php";
require __DIR__ . "/auth_helpers.php";
$user = require_auth($pdo);

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  header("Content-Type: application/json");
  echo json_encode(["error" => "Method not allowed"]);
  http_response_code(405);
  exit;
}

$field = "file";
if (empty($_FILES[$field]) || $_FILES[$field]["error"] !== UPLOAD_ERR_OK) {
  $field = "receipt";
}
if (empty($_FILES[$field]) || $_FILES[$field]["error"] !== UPLOAD_ERR_OK) {
  header("Content-Type: application/json");
  echo json_encode(["error" => "No file uploaded or upload error"]);
  http_response_code(400);
  exit;
}

$file = $_FILES[$field];
$name = $file["name"];
$tmp = $file["tmp_name"];
$size = (int) $file["size"];

$max_size = 10 * 1024 * 1024; // 10 MB
if ($size > $max_size) {
  header("Content-Type: application/json");
  echo json_encode(["error" => "File too large (max 10 MB)"]);
  http_response_code(400);
  exit;
}

$ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
$allowed = ["pdf", "jpg", "jpeg", "png", "gif", "webp"];
if (!in_array($ext, $allowed, true)) {
  header("Content-Type: application/json");
  echo json_encode(["error" => "Allowed types: PDF, JPG, PNG, GIF, WEBP"]);
  http_response_code(400);
  exit;
}

$dir = __DIR__ . "/uploads/receipts";
if (!is_dir($dir)) {
  if (!mkdir($dir, 0755, true)) {
    header("Content-Type: application/json");
    echo json_encode(["error" => "Server upload directory not available"]);
    http_response_code(500);
    exit;
  }
}

$safe_name = preg_replace('/[^a-zA-Z0-9._-]/', '', $name);
$safe_name = $safe_name ?: "file";
$unique = bin2hex(random_bytes(8)) . "_" . $safe_name;
$path = $dir . "/" . $unique;

if (!move_uploaded_file($tmp, $path)) {
  header("Content-Type: application/json");
  echo json_encode(["error" => "Failed to save file"]);
  http_response_code(500);
  exit;
}

$url = "/api/receipt.php?f=" . rawurlencode($unique);
header("Content-Type: application/json");
echo json_encode(["url" => $url]);
