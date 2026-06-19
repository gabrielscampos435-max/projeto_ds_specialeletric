<?php

declare(strict_types=1);

require_once __DIR__ . '/auth.php';

requireMethod('GET');
$loggedIn = isAdminLoggedIn();
if ($loggedIn) {
    touchAdminSession();
}

jsonResponse([
    'success' => true,
    'loggedIn' => $loggedIn,
    'csrfToken' => $loggedIn ? getCsrfToken() : null,
    'admin' => $loggedIn
        ? [
            'id' => (int) $_SESSION['admin_user_id'],
            'usuario' => $_SESSION['admin_usuario'],
        ]
        : null,
]);
