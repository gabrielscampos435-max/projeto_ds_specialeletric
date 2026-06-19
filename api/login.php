<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

requireMethod('POST');
assertLoginAllowed();

$input = getJsonInput();
$missing = validateRequired($input, ['usuario', 'senha']);

if ($missing !== []) {
    jsonResponse(['success' => false, 'message' => 'Informe usuário e senha.'], 422);
}

$usuario = sanitizeString($input['usuario'], 80);
$senha = (string) $input['senha'];

try {
    $pdo = getPDO();
    $stmt = $pdo->prepare('SELECT id, usuario, senha_hash FROM admin_users WHERE usuario = :usuario LIMIT 1');
    $stmt->execute(['usuario' => $usuario]);
    $admin = $stmt->fetch();

    if (!$admin || !password_verify($senha, $admin['senha_hash'])) {
        registerFailedLogin();
        jsonResponse(['success' => false, 'message' => 'Usuário ou senha inválidos.'], 401);
    }

    loginAdmin($admin['id'], $admin['usuario']);
    clearLoginRate();

    jsonResponse([
        'success' => true,
        'message' => 'Login realizado com sucesso.',
        'csrfToken' => getCsrfToken(),
        'admin' => [
            'id' => (int) $admin['id'],
            'usuario' => $admin['usuario'],
        ],
    ]);
} catch (Throwable $e) {
    logThrowable($e);
    jsonResponse(['success' => false, 'message' => 'Não foi possível realizar o login.'], 500);
}
