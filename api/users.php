<?php
// api/users.php - List users; admin can create/update users.
declare(strict_types=1);

require __DIR__ . "/config.php";
require __DIR__ . "/auth_helpers.php";
$user = require_auth($pdo);

$method = $_SERVER["REQUEST_METHOD"];
$is_admin = ($user["role"] ?? "") === "admin";

if ($method === "GET") {
  $stmt = $pdo->query("SELECT id, name, email, role FROM users ORDER BY name");
  respond(["items" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

if ($method === "POST" && $is_admin) {
  $in = json_input();
  $email = trim((string)($in["email"] ?? ""));
  $name = trim((string)($in["name"] ?? ""));
  $password = (string)($in["password"] ?? "");
  $role = trim((string)($in["role"] ?? "user"));

  if ($email === "" || $password === "" || strlen($password) < 6) {
    respond(["error" => "Email and password (min 6 characters) required"], 400);
  }
  if (!in_array($role, ["user", "admin"], true)) {
    $role = "user";
  }

  $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
  $stmt->execute([$email]);
  if ($stmt->fetch()) {
    respond(["error" => "User with this email already exists"], 400);
  }

  $hash = password_hash($password, PASSWORD_DEFAULT);
  $pdo->prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)")
    ->execute([$email, $name ?: $email, $hash, $role]);
  $id = (int) $pdo->lastInsertId();
  respond(["id" => $id, "email" => $email, "name" => $name ?: $email, "role" => $role], 201);
}

if ($method === "PATCH" && $is_admin) {
  $in = json_input();
  $id = (int)($in["id"] ?? 0);
  if ($id < 1) {
    respond(["error" => "User id required"], 400);
  }

  $updates = [];
  $params = [];
  if (array_key_exists("name", $in)) {
    $updates[] = "name = ?";
    $params[] = trim((string)$in["name"]);
  }
  if (array_key_exists("email", $in)) {
    $email = trim((string)$in["email"]);
    if ($email === "") {
      respond(["error" => "Email cannot be empty"], 400);
    }
    $updates[] = "email = ?";
    $params[] = $email;
  }
  if (array_key_exists("role", $in)) {
    $role = trim((string)$in["role"]);
    if (!in_array($role, ["user", "admin"], true)) $role = "user";
    $updates[] = "role = ?";
    $params[] = $role;
  }

  if (count($updates) === 0) {
    respond(["error" => "Nothing to update"], 400);
  }
  $params[] = $id;
  $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
  $pdo->prepare($sql)->execute($params);
  respond(["ok" => true]);
}

if (($method === "POST" || $method === "PATCH") && !$is_admin) {
  respond(["error" => "Admin role required"], 403);
}

respond(["error" => "Method not allowed"], 405);
