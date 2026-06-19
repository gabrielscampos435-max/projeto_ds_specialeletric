<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

function formatOrcamento(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'tipo' => 'orcamento',
        'nome' => $row['nome'],
        'wpp' => $row['wpp'],
        'carro' => $row['carro'],
        'ano' => $row['ano'],
        'problema' => $row['problema'],
        'servico' => $row['servico'],
        'horario' => $row['horario'],
        'midia' => $row['midia'],
        'status' => $row['status'],
        'criado_em' => $row['criado_em'],
        'atualizado_em' => $row['atualizado_em'],
        'criado' => $row['criado_em'],
    ];
}

function isPlausibleYear($year): bool
{
    if ($year === null || trim((string) $year) === '') {
        return true;
    }

    if (!preg_match('/^\d{4}$/', (string) $year)) {
        return false;
    }

    $value = (int) $year;
    return $value >= 1950 && $value <= ((int) date('Y') + 2);
}

function getRequestId(): int
{
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

    if (!$id || $id < 1) {
        jsonResponse(['success' => false, 'message' => 'ID inválido.'], 400);
    }

    return $id;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    $pdo = getPDO();

    if ($method === 'GET') {
        requireAdmin();

        $status = isset($_GET['status']) ? sanitizeString($_GET['status'], 40) : '';

        if ($status !== '' && !isValidStatus($status)) {
            jsonResponse(['success' => false, 'message' => 'Status inválido.'], 422);
        }

        if ($status !== '') {
            $stmt = $pdo->prepare('SELECT * FROM orcamentos WHERE status = :status ORDER BY criado_em DESC');
            $stmt->execute(['status' => $status]);
        } else {
            $stmt = $pdo->query('SELECT * FROM orcamentos ORDER BY criado_em DESC');
        }

        $items = array_map('formatOrcamento', $stmt->fetchAll());
        jsonResponse(['success' => true, 'data' => $items]);
    }

    if ($method === 'POST') {
        $input = getJsonInput();
        $missing = validateRequired($input, ['nome', 'wpp', 'carro', 'problema', 'servico']);

        if ($missing !== []) {
            jsonResponse(['success' => false, 'message' => 'Preencha todos os campos obrigatórios.'], 422);
        }

        $wpp = onlyDigits($input['wpp']);

        if (!isValidPhone($wpp)) {
            jsonResponse(['success' => false, 'message' => 'WhatsApp inválido.'], 422);
        }

        $ano = sanitizeString($input['ano'] ?? '', 10);
        if (!isPlausibleYear($ano)) {
            jsonResponse(['success' => false, 'message' => 'Ano do veículo inválido.'], 422);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO orcamentos (nome, wpp, carro, ano, problema, servico, horario, midia, status)
             VALUES (:nome, :wpp, :carro, :ano, :problema, :servico, :horario, :midia, "novo")'
        );
        $stmt->execute([
            'nome' => sanitizeString($input['nome'], 120),
            'wpp' => $wpp,
            'carro' => sanitizeString($input['carro'], 120),
            'ano' => $ano !== '' ? $ano : null,
            'problema' => sanitizeString($input['problema'], 2000),
            'servico' => sanitizeString($input['servico'], 120),
            'horario' => sanitizeString($input['horario'] ?? '', 80) ?: null,
            'midia' => sanitizeString($input['midia'] ?? '', 120) ?: null,
        ]);

        $stmt = $pdo->prepare('SELECT * FROM orcamentos WHERE id = :id');
        $stmt->execute(['id' => (int) $pdo->lastInsertId()]);
        jsonResponse(['success' => true, 'data' => formatOrcamento($stmt->fetch())], 201);
    }

    if ($method === 'PATCH') {
        requireCsrfToken();

        $id = getRequestId();
        $input = getJsonInput();
        $status = sanitizeString($input['status'] ?? '', 40);

        if (!isValidStatus($status)) {
            jsonResponse(['success' => false, 'message' => 'Status inválido.'], 422);
        }

        $stmt = $pdo->prepare('UPDATE orcamentos SET status = :status WHERE id = :id');
        $stmt->execute(['status' => $status, 'id' => $id]);

        if ($stmt->rowCount() < 1) {
            $check = $pdo->prepare('SELECT id FROM orcamentos WHERE id = :id');
            $check->execute(['id' => $id]);

            if (!$check->fetch()) {
                jsonResponse(['success' => false, 'message' => 'Orçamento não encontrado.'], 404);
            }
        }

        jsonResponse(['success' => true, 'message' => 'Status atualizado.']);
    }

    if ($method === 'DELETE') {
        requireCsrfToken();

        $id = getRequestId();
        $stmt = $pdo->prepare('DELETE FROM orcamentos WHERE id = :id');
        $stmt->execute(['id' => $id]);

        if ($stmt->rowCount() < 1) {
            jsonResponse(['success' => false, 'message' => 'Orçamento não encontrado.'], 404);
        }

        jsonResponse(['success' => true, 'message' => 'Orçamento excluído.']);
    }

    jsonResponse(['success' => false, 'message' => 'Método não permitido.'], 405);
} catch (Throwable $e) {
    logThrowable($e);
    jsonResponse(['success' => false, 'message' => 'Não foi possível processar a solicitação.'], 500);
}
