<?php
// api/receipt.php - GET: serve receipt file (no auth). DELETE: delete file (auth required).
declare(strict_types=1);

$method = $_SERVER["REQUEST_METHOD"] ?? "GET";
$f = isset($_GET["f"]) ? (string) $_GET["f"] : "";
$f = basename($f);
if ($f === "" || preg_match('/[^a-zA-Z0-9._-]/', $f)) {
  if ($method === "DELETE") {
    header("Content-Type: application/json");
    http_response_code(400);
    echo json_encode(["error" => "Invalid file"]);
    exit;
  }
  http_response_code(400);
  exit("Invalid file");
}

$path = __DIR__ . "/uploads/receipts/" . $f;

if ($method === "DELETE") {
  require __DIR__ . "/config.php";
  require __DIR__ . "/auth_helpers.php";
  $user = require_auth($pdo);

  if (!is_file($path)) {
    header("Content-Type: application/json");
    http_response_code(404);
    echo json_encode(["error" => "Not found"]);
    exit;
  }
  if (!unlink($path)) {
    header("Content-Type: application/json");
    http_response_code(500);
    echo json_encode(["error" => "Failed to delete file"]);
    exit;
  }
  header("Content-Type: application/json");
  echo json_encode(["ok" => true]);
  exit;
}

// GET: serve file (no auth so "View" link works in new tab; URLs are unguessable)
if (!is_file($path)) {
  http_response_code(404);
  exit("Not found");
}

$mimes = [
  "pdf" => "application/pdf",
  "jpg" => "image/jpeg",
  "jpeg" => "image/jpeg",
  "png" => "image/png",
  "gif" => "image/gif",
  "webp" => "image/webp",
];
$ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
$mime = $mimes[$ext] ?? "application/octet-stream";

header("Content-Type: " . $mime);
header("Content-Length: " . filesize($path));
header("Content-Disposition: inline; filename=\"" . basename($f, ".pdf") . "\"");
readfile($path);
