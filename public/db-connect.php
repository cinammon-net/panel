<?php
error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE & ~E_DEPRECATED);
ini_set('display_errors', '0');

$server = $_REQUEST['server'] ?? '127.0.0.1:3306';
$username = $_REQUEST['username'] ?? 'u2_admin';
$password = $_REQUEST['password'] ?? 'cnm_ffb44f998731';
$db = $_REQUEST['db'] ?? 's2_cinammon';
$driver = $_REQUEST['driver'] ?? 'server';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Conectando a <?= htmlspecialchars($db) ?> · Cinammon</title>
    <style>
        body {
            background-color: #080d16;
            color: #22d3ee;
            font-family: monospace;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
        }
        .card {
            border: 1px solid rgba(34, 211, 238, 0.4);
            border-radius: 12px;
            background: #0b1320;
            padding: 30px;
            text-align: center;
            box-shadow: 0 0 30px rgba(34, 211, 238, 0.2);
        }
        .spinner {
            border: 3px solid rgba(34, 211, 238, 0.2);
            border-top: 3px solid #22d3ee;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 16px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="spinner"></div>
        <h3 style="margin: 0 0 8px 0; font-size: 16px; letter-spacing: 1px; text-transform: uppercase;">
            Conectando al Gestor Web...
        </h3>
        <p style="margin: 0; color: #94a3b8; font-size: 13px;">
            Base de datos: <strong style="color: #fff;"><?= htmlspecialchars($db) ?></strong>
        </p>
    </div>

    <form id="autoLoginForm" method="post" action="/adminer.php">
        <input type="hidden" name="auth[driver]" value="<?= htmlspecialchars($driver) ?>">
        <input type="hidden" name="auth[server]" value="<?= htmlspecialchars($server) ?>">
        <input type="hidden" name="auth[username]" value="<?= htmlspecialchars($username) ?>">
        <input type="hidden" name="auth[password]" value="<?= htmlspecialchars($password) ?>">
        <input type="hidden" name="auth[db]" value="<?= htmlspecialchars($db) ?>">
    </form>

    <script>
        document.getElementById('autoLoginForm').submit();
    </script>
</body>
</html>
