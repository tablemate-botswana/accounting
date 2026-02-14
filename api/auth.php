<?php
// api/auth.php
declare(strict_types=1);

require __DIR__ . "/config.php";

$SECRET = getenv("JWT_SECRET") ?: "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET";

function sign_token(array $payload, string $secret): string {
  $payload["exp"] = time() + (60 * 60 * 12); // 12 hours
  $json = json_encode($payload);
  $b64 = rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
  $sig = hash_hmac('sha256', $b64, $secret, true);
  $sigb64 = rtrim(strtr(base64_encode($sig), '+/', '-_'), '=');
  return $b64 . "." . $sigb64;
}

function verify_token(string $token, string $secret): ?array {
  $parts = explode(".", $token);
  if (count($parts) !== 2) return null;
  [$b64, $sig] = $parts;
  $calc = rtrim(strtr(base64_encode(hash_hmac('sha256', $b64, $secret, true)), '+/', '-_'), '=');
  if (!hash_equals($calc, $sig)) return null;
  $json = base64_decode(strtr($b64, '-_', '+/'));
  $payload = json_decode($json, true);
  if (!is_array($payload) || empty($payload["exp"]) || $payload["exp"] < time()) return null;
  return $payload;
}

// Only handle the request when this file is the one that was requested (e.g. /api/auth.php),
// not when auth.php is included by another script (e.g. users.php, expenses.php).
$requested_script = basename($_SERVER["SCRIPT_FILENAME"] ?? "");
if ($requested_script !== "auth.php") {
  return;
}

$method = $_SERVER["REQUEST_METHOD"];

if ($method === "POST") {
  $in = json_input();
  $auth = $_SERVER["HTTP_AUTHORIZATION"] ?? "";
  $token = str_starts_with($auth, "Bearer ") ? substr($auth, 7) : null;
  $payload = $token ? verify_token($token, $SECRET) : null;

  $action = trim((string)($in["action"] ?? ""));

  // Change own password (authenticated user)
  if ($action === "change_password" && $payload) {
    $current = (string)($in["current_password"] ?? "");
    $new = (string)($in["new_password"] ?? "");
    if ($new === "" || strlen($new) < 6) {
      respond(["error" => "New password must be at least 6 characters"], 400);
    }
    $uid = (int)($payload["uid"] ?? 0);
    $stmt = $pdo->prepare("SELECT id, password_hash FROM users WHERE id = ?");
    $stmt->execute([$uid]);
    $u = $stmt->fetch();
    if (!$u || !password_verify($current, $u["password_hash"])) {
      respond(["error" => "Current password is incorrect"], 401);
    }
    $hash = password_hash($new, PASSWORD_DEFAULT);
    $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$hash, $uid]);
    respond(["ok" => true]);
  }

  // Admin: set another user's password
  if ($action === "set_password" && $payload) {
    if (($payload["role"] ?? "") !== "admin") {
      respond(["error" => "Admin role required"], 403);
    }
    $targetId = (int)($in["user_id"] ?? 0);
    $new = (string)($in["new_password"] ?? "");
    if ($targetId < 1 || $new === "" || strlen($new) < 6) {
      respond(["error" => "user_id and new_password (min 6 characters) required"], 400);
    }
    $hash = password_hash($new, PASSWORD_DEFAULT);
    $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$hash, $targetId]);
    respond(["ok" => true]);
  }

  // Login (no action or no token)
  $email = trim((string)($in["email"] ?? ""));
  $password = (string)($in["password"] ?? "");

  if ($email === "" || $password === "") {
    respond(["error" => "Missing credentials"], 400);
  }

  $stmt = $pdo->prepare("SELECT id,name,email,password_hash,role FROM users WHERE email = ?");
  $stmt->execute([$email]);
  $u = $stmt->fetch();

  if (!$u || !password_verify($password, $u["password_hash"])) {
    respond(["error" => "Invalid login"], 401);
  }

  $token = sign_token([
    "uid" => (int)$u["id"],
    "name" => $u["name"],
    "email" => $u["email"],
    "role" => $u["role"],
  ], $SECRET);

  respond(["token" => $token, "user" => ["id" => (int)$u["id"], "name" => $u["name"], "role" => $u["role"]]]);
}

if ($method === "GET") {
  $auth = $_SERVER["HTTP_AUTHORIZATION"] ?? "";
  if (!str_starts_with($auth, "Bearer ")) {
    respond(["error" => "No token"], 401);
  }
  $payload = verify_token(substr($auth, 7), $SECRET);
  if (!$payload) {
    respond(["error" => "Invalid token"], 401);
  }
  respond(["user" => $payload]);
}

respond(["error" => "Method not allowed"], 405);
