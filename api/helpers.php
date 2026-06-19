<?php

declare(strict_types=1);

function jsonResponse(array $data, int $statusCode = 200): void
{
    sendSecurityHeaders();
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function sendSecurityHeaders(): void
{
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
}

function isDebugEnabled(): bool
{
    return defined('DB_CONFIG') && !empty(DB_CONFIG['debug']);
}

function logThrowable(Throwable $e): void
{
    error_log(sprintf(
        '[DS Special Eletric] %s in %s:%d',
        $e->getMessage(),
        $e->getFile(),
        $e->getLine()
    ));
}

function getJsonInput(): array
{
    $rawInput = file_get_contents('php://input');

    if ($rawInput === false || trim($rawInput) === '') {
        return [];
    }

    $data = json_decode($rawInput, true);

    if (!is_array($data)) {
        jsonResponse(['success' => false, 'message' => 'JSON inválido.'], 400);
    }

    return $data;
}

function requireMethod(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== strtoupper($method)) {
        jsonResponse(['success' => false, 'message' => 'Método não permitido.'], 405);
    }
}

function validateRequired(array $data, array $fields): array
{
    $missing = [];

    foreach ($fields as $field) {
        if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
            $missing[] = $field;
        }
    }

    return $missing;
}

function onlyDigits($value): string
{
    return preg_replace('/\D+/', '', (string) $value) ?? '';
}

function sanitizeString($value, int $maxLength = 300): string
{
    $clean = trim(strip_tags((string) $value));

    if (function_exists('mb_substr')) {
        return mb_substr($clean, 0, $maxLength, 'UTF-8');
    }

    return substr($clean, 0, $maxLength);
}

function isValidPhone($value): bool
{
    $digits = onlyDigits($value);

    if (!in_array(strlen($digits), [10, 11], true)) {
        return false;
    }

    if (substr($digits, 0, 2) === '00') {
        return false;
    }

    return !preg_match('/^(\d)\1+$/', $digits);
}

function isValidDateValue(string $date): bool
{
    $parts = explode('-', $date);

    return count($parts) === 3 && checkdate((int) $parts[1], (int) $parts[2], (int) $parts[0]);
}

function normalizeTimeValue(string $time): ?string
{
    if (preg_match('/^\d{2}:\d{2}$/', $time)) {
        $time .= ':00';
    }

    if (!preg_match('/^\d{2}:\d{2}:\d{2}$/', $time)) {
        return null;
    }

    [$hour, $minute, $second] = array_map('intval', explode(':', $time));

    if ($hour > 23 || $minute > 59 || $second > 59) {
        return null;
    }

    return sprintf('%02d:%02d:%02d', $hour, $minute, $second);
}

function isPastScheduleDate(string $date): bool
{
    if (!isValidDateValue($date)) {
        return true;
    }

    $scheduleDate = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    $today = new DateTimeImmutable('today');

    return $scheduleDate < $today;
}

function getWeekdayNumber(string $date): int
{
    $scheduleDate = DateTimeImmutable::createFromFormat('!Y-m-d', $date);

    if (!$scheduleDate) {
        return 0;
    }

    return (int) $scheduleDate->format('N');
}

function getAllowedTimesForDate(string $date): array
{
    $weekday = getWeekdayNumber($date);

    if ($weekday >= 1 && $weekday <= 5) {
        return ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    }

    if ($weekday === 6) {
        return ['08:00', '09:00', '10:00', '11:00', '12:00'];
    }

    return [];
}

function isAllowedScheduleTime(string $date, string $time): bool
{
    $normalized = normalizeTimeValue($time);

    if ($normalized === null) {
        return false;
    }

    return in_array(substr($normalized, 0, 5), getAllowedTimesForDate($date), true);
}

function hasScheduleConflict(PDO $pdo, string $date, string $time): bool
{
    $normalized = normalizeTimeValue($time);

    if ($normalized === null) {
        return false;
    }

    $stmt = $pdo->prepare(
        "SELECT id
         FROM agendamentos
         WHERE data_agendamento = :data_agendamento
         AND hora_agendamento = :hora_agendamento
         AND status <> 'perdido'
         LIMIT 1"
    );
    $stmt->execute([
        'data_agendamento' => $date,
        'hora_agendamento' => $normalized,
    ]);

    return (bool) $stmt->fetch();
}

function isValidStatus($status): bool
{
    return in_array($status, ['novo', 'respondido', 'aguardando cliente', 'fechado', 'perdido'], true);
}

function isValidFeedbackStatus($status): bool
{
    return in_array($status, ['pendente', 'aprovado', 'reprovado'], true);
}
