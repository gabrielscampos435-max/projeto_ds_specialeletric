# DS Special Eletric

Site institucional e sistema administrativo para a DS Special Eletric, com formulários públicos, integração com WhatsApp e painel admin para gerenciar solicitações, agendamentos e feedbacks.

## Tecnologias

- HTML
- CSS
- JavaScript
- PHP
- MySQL/MariaDB
- XAMPP para ambiente local
- Font Awesome

## Funcionalidades

- Solicitação de orçamento pelo site
- Pré-agendamento de atendimento
- Envio de feedback por clientes
- Aprovação, reprovação e exclusão de feedbacks pelo admin
- Painel administrativo com login via PHP/session
- Dashboard administrativo
- Alteração de status de orçamentos e agendamentos
- Exclusão de orçamentos e agendamentos
- Integração com WhatsApp

## Como rodar localmente com XAMPP

1. Instale e abra o XAMPP.
2. Inicie os serviços Apache e MySQL.
3. Copie este projeto para a pasta `htdocs` do XAMPP.
4. Acesse o projeto pelo navegador:

```text
http://localhost/ds-special-eletric2/
```

5. Acesse o painel admin em:

```text
http://localhost/ds-special-eletric2/admin.html
```

## Como criar o banco no phpMyAdmin

1. Abra o phpMyAdmin:

```text
http://localhost/phpmyadmin
```

2. Crie um banco com o nome:

```text
ds_special_eletric
```

3. Use charset/collation compatível com UTF-8, preferencialmente:

```text
utf8mb4 / utf8mb4_unicode_ci
```

## Como importar o database.sql

1. No phpMyAdmin, selecione o banco `ds_special_eletric`.
2. Clique na aba `Importar`.
3. Selecione o arquivo `database.sql`.
4. Confirme a importação.

O arquivo `database.sql` deve permanecer versionado, pois é necessário para instalar o projeto em outro ambiente.

## Como configurar api/config.php

O arquivo real `api/config.php` contém as credenciais locais do banco e não deve ser enviado para o GitHub.

Use `api/config.example.php` como referência para os dados necessários e configure o `api/config.php` de acordo com o ambiente local ou hospedagem.

Exemplo de dados esperados:

- Host do banco
- Nome do banco
- Usuário do banco
- Senha do banco
- Charset `utf8mb4`
- Modo debug desativado em produção

## Como criar o admin inicial

Depois de configurar o banco e o `api/config.php`, acesse:

```text
http://localhost/ds-special-eletric2/api/setup_admin.php
```

Use esse script apenas para criar o usuário administrador inicial. Depois disso, por segurança, remova o arquivo do servidor ou mantenha-o fora do Git. Ele já está listado no `.gitignore`.

## Avisos de segurança antes de publicar

- Não publique `api/config.php` com credenciais reais.
- Remova ou bloqueie `api/setup_admin.php` após criar o admin inicial.
- Use senhas fortes para o painel administrativo.
- Desative mensagens de debug em produção.
- Use hospedagem com HTTPS.
- Garanta que o banco use `utf8mb4`.
- Revise permissões de arquivos no servidor.
- Faça backup do banco antes de atualizações.

## Hospedagem

Este projeto precisa de uma hospedagem com suporte a PHP e MySQL/MariaDB. Hospedagens somente estáticas não executam as APIs PHP nem o painel administrativo.
