<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

requireMethod('GET');

$data = isset($_GET['data']) ? sanitizeString($_GET['data'], 10) : '';

if ($data === '') {
    jsonResponse(['success' => false, 'message' => 'Informe a data para consultar os horários.'], 422);
}

if (!isValidDateValue($data)) {
    jsonResponse(['success' => false, 'message' => 'Data inválida.'], 422);
}

if (isPastScheduleDate($data)) {
    jsonResponse(['success' => false, 'message' => 'Não é possível agendar em uma data passada.'], 422);
}

if (getWeekdayNumber($data) === 7) {
    jsonResponse([
        'success' => true,
        'data' => [
            'data' => $data,
            'horarios' => [],
        ],
        'message' => 'Não atendemos aos domingos. Escolha outra data.',
    ]);
}

try {
    $pdo = getPDO();
    $allowedTimes = getAllowedTimesForDate($data);

    $stmt = $pdo->prepare(
        "SELECT TIME_FORMAT(hora_agendamento, '%H:%i') AS hora
         FROM agendamentos
         WHERE data_agendamento = :data_agendamento
         AND status <> 'perdido'"
    );
    $stmt->execute(['data_agendamento' => $data]);

    $busyTimes = array_column($stmt->fetchAll(), 'hora');
    $availableTimes = array_values(array_diff($allowedTimes, $busyTimes));
    $response = [
        'success' => true,
        'data' => [
            'data' => $data,
            'horarios' => $availableTimes,
        ],
    ];

    if ($availableTimes === []) {
        $response['message'] = 'Não há horários disponíveis para esta data.';
    }

    jsonResponse($response);
} catch (Throwable $e) {
    logThrowable($e);
    jsonResponse(['success' => false, 'message' => 'Não foi possível carregar os horários disponíveis.'], 500);
}
