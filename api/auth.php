<?php

declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

const ADMIN_SESSION_TIMEOUT = 7200;
const LOGIN_RATE_WINDOW = 900;
const LOGIN_RATE_MAX_ATTEMPTS = 5;

function startSecureSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_start();
}

function requireAdmin(): void
{
    startSecureSession();

    if (!isAdminLoggedIn()) {
        jsonResponse(['success' => false, 'message' => 'Acesso não autorizado.'], 401);
    }

    touchAdminSession();
}

function isAdminLoggedIn(): bool
{
    startSecureSession();

    if (empty($_SESSION['admin_user_id']) || empty($_SESSION['admin_usuario'])) {
        return false;
    }

    if (isset($_SESSION['last_activity']) && (time() - (int) $_SESSION['last_activity']) > ADMIN_SESSION_TIMEOUT) {
        logoutAdmin();
        return false;
    }

    return true;
}

function loginAdmin($userId, string $usuario): void
{
    startSecureSession();
    session_regenerate_id(true);

    $_SESSION['admin_user_id'] = (int) $userId;
    $_SESSION['admin_usuario'] = $usuario;
    $_SESSION['last_activity'] = time();
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

function logoutAdmin(): void
{
    startSecureSession();

    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );
    }

    session_destroy();
}

function touchAdminSession(): void
{
    $_SESSION['last_activity'] = time();

    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
}

function getCsrfToken(): string
{
    startSecureSession();

    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function requireCsrfToken(): void
{
    requireAdmin();

    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';

    if (!is_string($token) || $token === '' || !hash_equals(getCsrfToken(), $token)) {
        jsonResponse(['success' => false, 'message' => 'Token CSRF invÃ¡lido.'], 403);
    }
}

function assertLoginAllowed(): void
{
    startSecureSession();
    $now = time();
    $rate = $_SESSION['login_rate'] ?? ['attempts' => 0, 'first_attempt' => $now, 'blocked_until' => 0];

    if (!empty($rate['blocked_until']) && $now < (int) $rate['blocked_until']) {
        jsonResponse(['success' => false, 'message' => 'Muitas tentativas. Tente novamente mais tarde.'], 429);
    }

    if ($now - (int) ($rate['first_attempt'] ?? $now) > LOGIN_RATE_WINDOW) {
        $_SESSION['login_rate'] = ['attempts' => 0, 'first_attempt' => $now, 'blocked_until' => 0];
    }
}

function registerFailedLogin(): void
{
    startSecureSession();
    $now = time();
    $rate = $_SESSION['login_rate'] ?? ['attempts' => 0, 'first_attempt' => $now, 'blocked_until' => 0];

    if ($now - (int) ($rate['first_attempt'] ?? $now) > LOGIN_RATE_WINDOW) {
        $rate = ['attempts' => 0, 'first_attempt' => $now, 'blocked_until' => 0];
    }

    $rate['attempts'] = (int) ($rate['attempts'] ?? 0) + 1;

    if ($rate['attempts'] >= LOGIN_RATE_MAX_ATTEMPTS) {
        $rate['blocked_until'] = $now + LOGIN_RATE_WINDOW;
    }

    $_SESSION['login_rate'] = $rate;
}

function clearLoginRate(): void
{
    startSecureSession();
    unset($_SESSION['login_rate']);
}
