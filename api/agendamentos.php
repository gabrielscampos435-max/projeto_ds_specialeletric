<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

function formatAgendamento(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'tipo' => 'agendamento',
        'nome' => $row['nome'],
        'tel' => $row['tel'],
        'carro' => $row['carro'],
        'problema' => $row['problema'],
        'data_agendamento' => $row['data_agendamento'],
        'hora_agendamento' => $row['hora_agendamento'],
        'obs' => $row['obs'],
        'status' => $row['status'],
        'criado_em' => $row['criado_em'],
        'atualizado_em' => $row['atualizado_em'],
        'data' => $row['data_agendamento'],
        'hora' => substr((string) $row['hora_agendamento'], 0, 5),
        'criado' => $row['criado_em'],
    ];
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
            $stmt = $pdo->prepare('SELECT * FROM agendamentos WHERE status = :status ORDER BY criado_em DESC');
            $stmt->execute(['status' => $status]);
        } else {
            $stmt = $pdo->query('SELECT * FROM agendamentos ORDER BY criado_em DESC');
        }

        $items = array_map('formatAgendamento', $stmt->fetchAll());
        jsonResponse(['success' => true, 'data' => $items]);
    }

    if ($method === 'POST') {
        $input = getJsonInput();
        $missing = validateRequired($input, ['nome', 'tel', 'carro', 'data_agendamento', 'hora_agendamento']);

        if ($missing !== []) {
            jsonResponse(['success' => false, 'message' => 'Preencha todos os campos obrigatórios.'], 422);
        }

        $tel = onlyDigits($input['tel']);

        if (!isValidPhone($tel)) {
            jsonResponse(['success' => false, 'message' => 'Telefone inválido.'], 422);
        }

        $dataAgendamento = sanitizeString($input['data_agendamento'], 10);
        $horaAgendamento = normalizeTimeValue(sanitizeString($input['hora_agendamento'], 8));

        if (!isValidDateValue($dataAgendamento)) {
            jsonResponse(['success' => false, 'message' => 'Data inválida.'], 422);
        }

        if ($horaAgendamento === null) {
            jsonResponse(['success' => false, 'message' => 'Hora inválida.'], 422);
        }
        if (isPastScheduleDate($dataAgendamento)) {
            jsonResponse(['success' => false, 'message' => 'Não é possível agendar em uma data passada.'], 422);
        }

        if (getWeekdayNumber($dataAgendamento) === 7) {
            jsonResponse(['success' => false, 'message' => 'Não atendemos aos domingos. Escolha outra data.'], 422);
        }

        if (!isAllowedScheduleTime($dataAgendamento, $horaAgendamento)) {
            jsonResponse(['success' => false, 'message' => 'Horário fora do período de atendimento.'], 422);
        }

        if (hasScheduleConflict($pdo, $dataAgendamento, $horaAgendamento)) {
            jsonResponse(['success' => false, 'message' => 'Este horário já está ocupado. Escolha outro horário.'], 409);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO agendamentos (nome, tel, carro, problema, data_agendamento, hora_agendamento, obs, status)
             VALUES (:nome, :tel, :carro, :problema, :data_agendamento, :hora_agendamento, :obs, "novo")'
        );
        $stmt->execute([
            'nome' => sanitizeString($input['nome'], 120),
            'tel' => $tel,
            'carro' => sanitizeString($input['carro'], 120),
            'problema' => sanitizeString($input['problema'] ?? '', 255) ?: null,
            'data_agendamento' => $dataAgendamento,
            'hora_agendamento' => $horaAgendamento,
            'obs' => sanitizeString($input['obs'] ?? '', 2000) ?: null,
        ]);

        $stmt = $pdo->prepare('SELECT * FROM agendamentos WHERE id = :id');
        $stmt->execute(['id' => (int) $pdo->lastInsertId()]);
        jsonResponse(['success' => true, 'data' => formatAgendamento($stmt->fetch())], 201);
    }

    if ($method === 'PATCH') {
        requireCsrfToken();

        $id = getRequestId();
        $input = getJsonInput();
        $status = sanitizeString($input['status'] ?? '', 40);

        if (!isValidStatus($status)) {
            jsonResponse(['success' => false, 'message' => 'Status inválido.'], 422);
        }

        $stmt = $pdo->prepare('UPDATE agendamentos SET status = :status WHERE id = :id');
        $stmt->execute(['status' => $status, 'id' => $id]);

        if ($stmt->rowCount() < 1) {
            $check = $pdo->prepare('SELECT id FROM agendamentos WHERE id = :id');
            $check->execute(['id' => $id]);

            if (!$check->fetch()) {
                jsonResponse(['success' => false, 'message' => 'Agendamento não encontrado.'], 404);
            }
        }

        jsonResponse(['success' => true, 'message' => 'Status atualizado.']);
    }

    if ($method === 'DELETE') {
        requireCsrfToken();

        $id = getRequestId();
        $stmt = $pdo->prepare('DELETE FROM agendamentos WHERE id = :id');
        $stmt->execute(['id' => $id]);

        if ($stmt->rowCount() < 1) {
            jsonResponse(['success' => false, 'message' => 'Agendamento não encontrado.'], 404);
        }

        jsonResponse(['success' => true, 'message' => 'Agendamento excluído.']);
    }

    jsonResponse(['success' => false, 'message' => 'Método não permitido.'], 405);
} catch (Throwable $e) {
    logThrowable($e);
    jsonResponse(['success' => false, 'message' => 'Não foi possível processar a solicitação.'], 500);
}
