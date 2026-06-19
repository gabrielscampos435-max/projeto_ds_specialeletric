<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

requireMethod('GET');
requireAdmin();

try {
    $pdo = getPDO();

    $totalOrcamentos = (int) $pdo->query('SELECT COUNT(*) FROM orcamentos')->fetchColumn();
    $totalAgendamentos = (int) $pdo->query('SELECT COUNT(*) FROM agendamentos')->fetchColumn();
    $totalFeedbacks = (int) $pdo->query('SELECT COUNT(*) FROM feedbacks')->fetchColumn();
    $feedbacksPendentes = (int) $pdo->query("SELECT COUNT(*) FROM feedbacks WHERE status = 'pendente'")->fetchColumn();
    $feedbacksAprovados = (int) $pdo->query("SELECT COUNT(*) FROM feedbacks WHERE status = 'aprovado'")->fetchColumn();
    $feedbacksReprovados = (int) $pdo->query("SELECT COUNT(*) FROM feedbacks WHERE status = 'reprovado'")->fetchColumn();
    $agendamentosHoje = (int) $pdo->query('SELECT COUNT(*) FROM agendamentos WHERE data_agendamento = CURDATE()')->fetchColumn();

    $totalNovos = (int) $pdo->query(
        "SELECT
            (SELECT COUNT(*) FROM orcamentos WHERE status = 'novo') +
            (SELECT COUNT(*) FROM agendamentos WHERE status = 'novo')"
    )->fetchColumn();

    $totalFechados = (int) $pdo->query(
        "SELECT
            (SELECT COUNT(*) FROM orcamentos WHERE status = 'fechado') +
            (SELECT COUNT(*) FROM agendamentos WHERE status = 'fechado')"
    )->fetchColumn();

    $statusNovo = $totalNovos;
    $statusRespondido = (int) $pdo->query(
        "SELECT
            (SELECT COUNT(*) FROM orcamentos WHERE status = 'respondido') +
            (SELECT COUNT(*) FROM agendamentos WHERE status = 'respondido')"
    )->fetchColumn();
    $statusAguardando = (int) $pdo->query(
        "SELECT
            (SELECT COUNT(*) FROM orcamentos WHERE status = 'aguardando cliente') +
            (SELECT COUNT(*) FROM agendamentos WHERE status = 'aguardando cliente')"
    )->fetchColumn();
    $statusFechado = $totalFechados;
    $statusPerdido = (int) $pdo->query(
        "SELECT
            (SELECT COUNT(*) FROM orcamentos WHERE status = 'perdido') +
            (SELECT COUNT(*) FROM agendamentos WHERE status = 'perdido')"
    )->fetchColumn();

    $stmt = $pdo->query(
        "(SELECT id, 'orcamento' AS tipo, nome, carro, status, criado_em FROM orcamentos)
         UNION ALL
         (SELECT id, 'agendamento' AS tipo, nome, carro, status, criado_em FROM agendamentos)
         ORDER BY criado_em DESC
         LIMIT 8"
    );

    $ultimas = array_map(static function (array $row): array {
        return [
            'id' => (int) $row['id'],
            'tipo' => $row['tipo'],
            'nome' => $row['nome'],
            'carro' => $row['carro'],
            'status' => $row['status'],
            'criado_em' => $row['criado_em'],
            'criado' => $row['criado_em'],
        ];
    }, $stmt->fetchAll());

    jsonResponse([
        'success' => true,
        'data' => [
            'total_orcamentos' => $totalOrcamentos,
            'total_agendamentos' => $totalAgendamentos,
            'total_novos' => $totalNovos,
            'total_fechados' => $totalFechados,
            'total_feedbacks' => $totalFeedbacks,
            'feedbacks_pendentes' => $feedbacksPendentes,
            'feedbacks_aprovados' => $feedbacksAprovados,
            'feedbacks_reprovados' => $feedbacksReprovados,
            'agendamentos_hoje' => $agendamentosHoje,
            'status_novo' => $statusNovo,
            'status_respondido' => $statusRespondido,
            'status_aguardando' => $statusAguardando,
            'status_fechado' => $statusFechado,
            'status_perdido' => $statusPerdido,
            'ultimas_solicitacoes' => $ultimas,
        ],
    ]);
} catch (Throwable $e) {
    logThrowable($e);
    jsonResponse(['success' => false, 'message' => 'Não foi possível carregar o dashboard.'], 500);
}
