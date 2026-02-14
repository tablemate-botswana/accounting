<?php
// api/categories.php
declare(strict_types=1);

require __DIR__ . "/config.php";
require __DIR__ . "/auth_helpers.php";
$user = require_auth($pdo);

$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
  $stmt = $pdo->query("SELECT id, name FROM categories ORDER BY name");
  respond(["items" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

if ($method === "POST") {
  $in = json_input();
  $name = trim((string)($in["name"] ?? ""));

  if ($name === "") {
    respond(["error" => "Name required"], 400);
  }

  $stmt = $pdo->prepare("INSERT INTO categories (name) VALUES (?)");
  $stmt->execute([$name]);
  $id = (int) $pdo->lastInsertId();

  respond(["id" => $id, "name" => $name], 201);
}

respond(["error" => "Method not allowed"], 405);
