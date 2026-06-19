<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

function formatFeedback(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'nome' => $row['nome'],
        'cidade' => $row['cidade'],
        'nota' => (int) $row['nota'],
        'texto' => $row['texto'],
        'status' => $row['status'],
        'criado_em' => $row['criado_em'],
        'atualizado_em' => $row['atualizado_em'],
        'criado' => $row['criado_em'],
    ];
}

function getFeedbackId(): int
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
        $isAdmin = isset($_GET['admin']) && $_GET['admin'] === '1';

        if ($isAdmin) {
            requireAdmin();

            $status = isset($_GET['status']) ? sanitizeString($_GET['status'], 40) : '';

            if ($status !== '' && !isValidFeedbackStatus($status)) {
                jsonResponse(['success' => false, 'message' => 'Status inválido.'], 422);
            }

            if ($status !== '') {
                $stmt = $pdo->prepare('SELECT * FROM feedbacks WHERE status = :status ORDER BY criado_em DESC');
                $stmt->execute(['status' => $status]);
            } else {
                $stmt = $pdo->query('SELECT * FROM feedbacks ORDER BY criado_em DESC');
            }
        } else {
            $stmt = $pdo->prepare('SELECT * FROM feedbacks WHERE status = :status ORDER BY criado_em DESC LIMIT 6');
            $stmt->execute(['status' => 'aprovado']);
        }

        jsonResponse(['success' => true, 'data' => array_map('formatFeedback', $stmt->fetchAll())]);
    }

    if ($method === 'POST') {
        $input = getJsonInput();
        $missing = validateRequired($input, ['nome', 'cidade', 'nota', 'texto']);

        if ($missing !== []) {
            jsonResponse(['success' => false, 'message' => 'Preencha todos os campos obrigatórios.'], 422);
        }

        $nota = filter_var($input['nota'], FILTER_VALIDATE_INT);

        if ($nota === false || $nota < 1 || $nota > 5) {
            jsonResponse(['success' => false, 'message' => 'Nota inválida.'], 422);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO feedbacks (nome, cidade, nota, texto, status)
             VALUES (:nome, :cidade, :nota, :texto, "pendente")'
        );
        $stmt->execute([
            'nome' => sanitizeString($input['nome'], 120),
            'cidade' => sanitizeString($input['cidade'], 120),
            'nota' => $nota,
            'texto' => sanitizeString($input['texto'], 2000),
        ]);

        $stmt = $pdo->prepare('SELECT * FROM feedbacks WHERE id = :id');
        $stmt->execute(['id' => (int) $pdo->lastInsertId()]);

        jsonResponse(['success' => true, 'data' => formatFeedback($stmt->fetch())], 201);
    }

    if ($method === 'PATCH') {
        requireCsrfToken();

        $id = getFeedbackId();
        $input = getJsonInput();
        $status = sanitizeString($input['status'] ?? '', 40);

        if (!isValidFeedbackStatus($status)) {
            jsonResponse(['success' => false, 'message' => 'Status inválido.'], 422);
        }

        $stmt = $pdo->prepare('UPDATE feedbacks SET status = :status WHERE id = :id');
        $stmt->execute(['status' => $status, 'id' => $id]);

        if ($stmt->rowCount() < 1) {
            $check = $pdo->prepare('SELECT id FROM feedbacks WHERE id = :id');
            $check->execute(['id' => $id]);

            if (!$check->fetch()) {
                jsonResponse(['success' => false, 'message' => 'Feedback não encontrado.'], 404);
            }
        }

        jsonResponse(['success' => true, 'message' => 'Feedback atualizado.']);
    }

    if ($method === 'DELETE') {
        requireCsrfToken();

        $id = getFeedbackId();
        $stmt = $pdo->prepare('DELETE FROM feedbacks WHERE id = :id');
        $stmt->execute(['id' => $id]);

        if ($stmt->rowCount() < 1) {
            jsonResponse(['success' => false, 'message' => 'Feedback não encontrado.'], 404);
        }

        jsonResponse(['success' => true, 'message' => 'Feedback excluído.']);
    }

    jsonResponse(['success' => false, 'message' => 'Método não permitido.'], 405);
} catch (Throwable $e) {
    logThrowable($e);
    jsonResponse(['success' => false, 'message' => 'Não foi possível processar o feedback.'], 500);
}
