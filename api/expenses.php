<?php
// api/expenses.php
declare(strict_types=1);

/**
 * Soft delete: expenses are marked removed, not deleted.
 * Run once on your DB:
 *
 *   ALTER TABLE expenses
 *     ADD COLUMN removed_at TIMESTAMP NULL DEFAULT NULL,
 *     ADD COLUMN removed_by INT NULL DEFAULT NULL,
 *     ADD COLUMN added_by INT NULL DEFAULT NULL;
 *
 *   If storing multiple receipt URLs per expense, use: ALTER TABLE expenses MODIFY receipt_url TEXT;
 *
 *   CREATE TABLE expense_audit_log (
 *     id INT AUTO_INCREMENT PRIMARY KEY,
 *     expense_id INT NOT NULL,
 *     action VARCHAR(50) NOT NULL,
 *     user_id INT NOT NULL,
 *     user_name VARCHAR(255) DEFAULT '',
 *     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 *   );
 */

require __DIR__ . "/config.php";
require __DIR__ . "/auth_helpers.php";
$user = require_auth($pdo);

$method = $_SERVER["REQUEST_METHOD"];

/** Normalize receipt_url from DB (string or JSON array) to array of URLs. */
function receipt_url_to_array($raw): array {
  if ($raw === null || $raw === "") return [];
  if (is_array($raw)) return array_values(array_filter(array_map("trim", $raw)));
  $s = trim((string) $raw);
  if ($s === "") return [];
  if ($s[0] === "[" && ($decoded = json_decode($s, true)) && is_array($decoded)) {
    return array_values(array_filter(array_map("trim", $decoded)));
  }
  return [$s];
}

/** Encode receipt_url for DB: array or single string → JSON string. */
function receipt_url_to_db($value): ?string {
  if ($value === null) return null;
  $arr = is_array($value) ? $value : [trim((string) $value)];
  $arr = array_values(array_filter(array_map("trim", $arr)));
  if (count($arr) === 0) return null;
  return json_encode($arr);
}

function build_filters(array &$params): string {
  $w = ["(e.removed_at IS NULL)"];

  if (!empty($_GET["from"])) { $w[] = "e.expense_date >= ?"; $params[] = $_GET["from"]; }
  if (!empty($_GET["to"]))   { $w[] = "e.expense_date <= ?"; $params[] = $_GET["to"]; }

  if (!empty($_GET["user_id"])) { $w[] = "e.user_id = ?"; $params[] = (int)$_GET["user_id"]; }
  if (!empty($_GET["supplier_id"])) { $w[] = "e.supplier_id = ?"; $params[] = (int)$_GET["supplier_id"]; }
  if (!empty($_GET["category_id"])) { $w[] = "e.category_id = ?"; $params[] = (int)$_GET["category_id"]; }

  return "WHERE " . implode(" AND ", $w);
}

if ($method === "GET") {
  $mode = $_GET["mode"] ?? "list"; // list | summary | by_supplier | by_category | by_user

  $params = [];
  $where = build_filters($params);

  if ($mode === "list") {
    // List includes removed expenses (show them crossed out); aggregates (summary, by_user, etc.) exclude them
    $list_params = [];
    $list_where = "";
    $list_parts = [];
    if (!empty($_GET["from"])) { $list_parts[] = "e.expense_date >= ?"; $list_params[] = $_GET["from"]; }
    if (!empty($_GET["to"]))   { $list_parts[] = "e.expense_date <= ?"; $list_params[] = $_GET["to"]; }
    if (!empty($_GET["user_id"])) { $list_parts[] = "e.user_id = ?"; $list_params[] = (int)$_GET["user_id"]; }
    if (!empty($_GET["supplier_id"])) { $list_parts[] = "e.supplier_id = ?"; $list_params[] = (int)$_GET["supplier_id"]; }
    if (!empty($_GET["category_id"])) { $list_parts[] = "e.category_id = ?"; $list_params[] = (int)$_GET["category_id"]; }
    if ($list_parts) $list_where = "WHERE " . implode(" AND ", $list_parts);

    $sql = "
      SELECT
        e.id, e.expense_date, e.amount, e.currency, e.description, e.payment_method, e.receipt_url,
        e.removed_at, e.removed_by, e.added_by,
        u.id AS user_id, u.name AS user_name,
        adder.name AS added_by_name,
        remover.name AS removed_by_name,
        s.id AS supplier_id, s.name AS supplier_name,
        c.id AS category_id, c.name AS category_name
      FROM expenses e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN users adder ON adder.id = e.added_by
      LEFT JOIN users remover ON remover.id = e.removed_by
      LEFT JOIN suppliers s ON s.id = e.supplier_id
      LEFT JOIN categories c ON c.id = e.category_id
      $list_where
      ORDER BY e.expense_date DESC, e.id DESC
      LIMIT 500
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($list_params);
    $items = $stmt->fetchAll();
    foreach ($items as &$row) {
      $row["receipt_url"] = receipt_url_to_array($row["receipt_url"] ?? null);
    }
    unset($row);
    respond(["items" => $items]);
  }

  if ($mode === "summary") {
    $sql = "SELECT COALESCE(SUM(e.amount),0) AS total_amount FROM expenses e $where";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    respond(["total" => (float)$stmt->fetch()["total_amount"]]);
  }

  if ($mode === "by_user") {
    $sql = "
      SELECT u.id, u.name, COALESCE(SUM(e.amount),0) AS total
      FROM expenses e
      JOIN users u ON u.id = e.user_id
      $where
      GROUP BY u.id, u.name
      ORDER BY total DESC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    respond(["items" => $stmt->fetchAll()]);
  }

  if ($mode === "by_supplier") {
    $sql = "
      SELECT COALESCE(s.name,'(No supplier)') AS supplier, COALESCE(SUM(e.amount),0) AS total
      FROM expenses e
      LEFT JOIN suppliers s ON s.id = e.supplier_id
      $where
      GROUP BY supplier
      ORDER BY total DESC
      LIMIT 100
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    respond(["items" => $stmt->fetchAll()]);
  }

  if ($mode === "by_category") {
    $sql = "
      SELECT COALESCE(c.name,'(No category)') AS category, COALESCE(SUM(e.amount),0) AS total
      FROM expenses e
      LEFT JOIN categories c ON c.id = e.category_id
      $where
      GROUP BY category
      ORDER BY total DESC
      LIMIT 100
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    respond(["items" => $stmt->fetchAll()]);
  }

  if ($mode === "audit") {
    $sql = "
      SELECT a.id, a.expense_id, a.action, a.user_id, a.user_name, a.created_at,
             e.expense_date, e.amount, e.currency, e.description
      FROM expense_audit_log a
      LEFT JOIN expenses e ON e.id = a.expense_id
      ORDER BY a.created_at DESC
      LIMIT 200
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    respond(["items" => $stmt->fetchAll()]);
  }

  respond(["error" => "Unknown mode"], 400);
}

if ($method === "POST") {
  $in = json_input();

  $expense_date = trim((string)($in["expense_date"] ?? ""));
  $amount_raw   = $in["amount"] ?? null;

  if ($expense_date === "" || $amount_raw === null || $amount_raw === "") {
    respond([
      "error" => "expense_date and amount required",
      "received_keys" => array_keys($in),
      "received_expense_date" => $expense_date,
      "received_amount" => $amount_raw
    ], 400);
  }

  $amount = (float) preg_replace('/[^0-9.]/', '', (string) $amount_raw);

  $sql = "INSERT INTO expenses
    (user_id, added_by, supplier_id, category_id, expense_date, description, amount, currency, payment_method, receipt_url)
    VALUES (?,?,?,?,?,?,?,?,?,?)";

  $stmt = $pdo->prepare($sql);
  $stmt->execute([
    (int)($in["user_id"] ?? $user["id"]),
    $user["id"],
    !empty($in["supplier_id"]) ? (int)$in["supplier_id"] : null,
    !empty($in["category_id"]) ? (int)$in["category_id"] : null,
    $expense_date,
    $in["description"] ?? null,
    $amount,
    $in["currency"] ?? "USD",
    $in["payment_method"] ?? null,
    receipt_url_to_db($in["receipt_url"] ?? null)
  ]);

  $expense_id = (int) $pdo->lastInsertId();

  try {
    $pdo->prepare("INSERT INTO expense_audit_log (expense_id, action, user_id, user_name) VALUES (?, 'added', ?, ?)")
      ->execute([$expense_id, $user["id"], $user["name"] ?? ""]);
  } catch (Throwable $e) {
    // Audit log optional; expense still created
  }

  respond(["id" => $expense_id], 201);
}

if ($method === "PATCH") {
  $in = json_input();
  $id = isset($in["id"]) ? (int)$in["id"] : (isset($_GET["id"]) ? (int)$_GET["id"] : 0);
  if ($id <= 0) {
    respond(["error" => "Missing or invalid expense id"], 400);
  }

  $updates = [];
  $params = [];
  if (array_key_exists("receipt_url", $in)) {
    $updates[] = "receipt_url = ?";
    $params[] = receipt_url_to_db($in["receipt_url"]);
  }
  if (count($updates) === 0) {
    respond(["error" => "Nothing to update (receipt_url allowed)"], 400);
  }
  $params[] = $id;
  $sql = "UPDATE expenses SET " . implode(", ", $updates) . " WHERE id = ?";
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  if ($stmt->rowCount() === 0) {
    respond(["error" => "Expense not found"], 404);
  }
  respond(["ok" => true]);
}

if ($method === "DELETE") {
  $id = isset($_GET["id"]) ? (int)$_GET["id"] : 0;
  if ($id <= 0) {
    respond(["error" => "Missing or invalid id"], 400);
  }

  // Soft delete only: mark as removed, do NOT delete the row. Any authenticated user can remove any expense.
  try {
    $stmt = $pdo->prepare("UPDATE expenses SET removed_at = NOW(), removed_by = ? WHERE id = ? AND (removed_at IS NULL)");
    $stmt->execute([$user["id"], $id]);
  } catch (Throwable $e) {
    respond(["error" => "Schema required: add removed_at, removed_by to expenses table. " . $e->getMessage()], 500);
  }

  if ($stmt->rowCount() === 0) {
    respond(["error" => "Expense not found or already removed"], 404);
  }

  try {
    $pdo->prepare("INSERT INTO expense_audit_log (expense_id, action, user_id, user_name) VALUES (?, 'removed', ?, ?)")
      ->execute([$id, $user["id"], $user["name"] ?? ""]);
  } catch (Throwable $e) {
    // Audit log optional; soft delete still succeeded
  }

  respond(["ok" => true]);
}

respond(["error" => "Method not allowed"], 405);
