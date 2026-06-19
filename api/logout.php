<?php

declare(strict_types=1);

require_once __DIR__ . '/auth.php';

requireMethod('POST');
requireCsrfToken();
logoutAdmin();

jsonResponse(['success' => true, 'message' => 'Logout realizado com sucesso.']);
