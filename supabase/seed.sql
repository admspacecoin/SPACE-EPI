-- =========================================================
-- DADOS DE DEMONSTRAÇÃO (seção 51)
-- Cobre todos os cenários necessários para testar Dashboard e Alertas:
-- colaborador ativo/férias/afastado/desligado, estoque normal/baixo/zerado,
-- CA vencido/vencendo, exame vencido/vencendo.
-- =========================================================

insert into obras (id, nome, codigo, endereco, responsavel, status, data_inicio)
values ('00000000-0000-0000-0000-000000000001', 'Residencial Vista Verde [DEMO]', 'OBRA-001', 'Fortaleza, CE', 'Eng. Marcos Lima', 'ativo', '2025-01-15');

insert into settings (obra_id, dias_alerta_ca, dias_alerta_exame, nome_obra_exibido)
values ('00000000-0000-0000-0000-000000000001', 30, 30, 'Residencial Vista Verde');

-- Empresas
insert into companies (id, obra_id, nome, cnpj, responsavel, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Construtora Alfa [DEMO]', '11.111.111/0001-11', 'Ana Souza', 'ativo'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Empreiteira Beta [DEMO]', '22.222.222/0001-22', 'Bruno Reis', 'ativo');

-- Setores
insert into sectors (id, obra_id, nome) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Estrutura'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Elétrica'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Almoxarifado'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Segurança');

-- Funções
insert into job_functions (id, nome) values
  ('30000000-0000-0000-0000-000000000001', 'Pedreiro'),
  ('30000000-0000-0000-0000-000000000002', 'Eletricista'),
  ('30000000-0000-0000-0000-000000000003', 'Almoxarife'),
  ('30000000-0000-0000-0000-000000000004', 'Técnico de Segurança'),
  ('30000000-0000-0000-0000-000000000005', 'Servente');

-- Colaboradores [DEMO] — cobrindo todas as situações
insert into employees (id, obra_id, company_id, sector_id, job_function_id, nome_completo, matricula, cpf, data_admissao, situacao) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'João Silva [DEMO]', 'MAT-001', '111.111.111-11', '2025-02-01', 'ativo'),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'Maria Oliveira [DEMO]', 'MAT-002', '222.222.222-22', '2025-02-10', 'ferias'),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Pedro Santos [DEMO]', 'MAT-003', '333.333.333-33', '2025-01-20', 'afastamento'),
  ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'Carlos Pereira [DEMO]', 'MAT-004', '444.444.444-44', '2024-11-05', 'desligado'),
  ('40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', 'Fernanda Costa [DEMO]', 'MAT-005', '555.555.555-55', '2025-03-01', 'ativo'),
  ('40000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Rafael Almeida [DEMO]', 'MAT-006', '666.666.666-66', '2025-04-12', 'ativo'),
  ('40000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'Juliana Martins [DEMO]', 'MAT-007', '777.777.777-77', '2025-05-02', 'ativo'),
  ('40000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Marcos Lima [DEMO]', 'MAT-008', '888.888.888-88', '2025-01-08', 'ativo'),
  ('40000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'Patrícia Rocha [DEMO]', 'MAT-009', '999.999.999-99', '2025-06-15', 'ativo'),
  ('40000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', 'Diego Fernandes [DEMO]', 'MAT-010', '101.010.101-01', '2025-07-01', 'ativo');

update employees set data_desligamento = '2026-06-30' where id = '40000000-0000-0000-0000-000000000004';

-- Categorias e EPIs
insert into ppe_categories (id, nome) values
  ('50000000-0000-0000-0000-000000000001', 'Proteção da Cabeça'),
  ('50000000-0000-0000-0000-000000000002', 'Proteção do Corpo'),
  ('50000000-0000-0000-0000-000000000003', 'Proteção dos Pés');

insert into ppe_items (id, obra_id, categoria_id, nome, codigo_interno, ca_numero, ca_validade, estoque_minimo, unidade_medida, status) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Capacete de Segurança [DEMO]', 'EPI-CAP', 'CA-31000', '2027-05-01', 20, 'UN', 'ativo'),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'Colete Refletivo [DEMO]', 'EPI-COL', 'CA-28500', '2026-09-10', 20, 'UN', 'ativo'), -- vencendo em breve
  ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 'Botina de Segurança [DEMO]', 'EPI-BOT', 'CA-19000', '2026-03-01', 15, 'PAR', 'ativo'); -- CA vencido

-- Atributos e valores
insert into ppe_attributes (id, nome) values
  ('70000000-0000-0000-0000-000000000001', 'Cor'),
  ('70000000-0000-0000-0000-000000000002', 'Tamanho');

insert into ppe_item_attributes (ppe_item_id, attribute_id) values
  ('60000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001'), -- Capacete usa Cor
  ('60000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001'), -- Colete usa Cor
  ('60000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002'), -- Colete usa Tamanho
  ('60000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000002'); -- Botina usa Tamanho

insert into ppe_attribute_values (id, attribute_id, valor) values
  ('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Branco'),
  ('80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 'Amarelo'),
  ('80000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000002', 'M'),
  ('80000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000002', 'G'),
  ('80000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000002', '40');

-- Variações
insert into ppe_variants (id, ppe_item_id, sku_gerado) values
  ('90000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'CAP-BRANCO'),
  ('90000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'CAP-AMARELO'),
  ('90000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000002', 'COL-M'),
  ('90000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000002', 'COL-G'),
  ('90000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000003', 'BOT-40');

insert into ppe_variant_values (variant_id, attribute_value_id) values
  ('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001'),
  ('90000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002'),
  ('90000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000003'),
  ('90000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000004'),
  ('90000000-0000-0000-0000-000000000005', '80000000-0000-0000-0000-000000000005');

-- Entradas de estoque (geram o saldo via trigger)
-- Capacete Branco: estoque normal (25)
insert into inventory_movements (variant_id, obra_id, tipo, quantidade, origem, observacao) values
  ('90000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'entrada', 25, 'Fornecedor XPTO [DEMO]', 'Carga inicial');
-- Capacete Amarelo: estoque baixo (8, mínimo 20)
insert into inventory_movements (variant_id, obra_id, tipo, quantidade, origem, observacao) values
  ('90000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'entrada', 8, 'Fornecedor XPTO [DEMO]', 'Carga inicial');
-- Colete M: estoque normal (42)
insert into inventory_movements (variant_id, obra_id, tipo, quantidade, origem, observacao) values
  ('90000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'entrada', 42, 'Fornecedor XPTO [DEMO]', 'Carga inicial');
-- Colete G: sem estoque (0) — não inserimos movimentação, fica com saldo zero (linha criada abaixo)
insert into inventory (variant_id, obra_id, quantidade_atual) values
  ('90000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 0)
  on conflict (variant_id) do nothing;
-- Botina 40: estoque normal (18)
insert into inventory_movements (variant_id, obra_id, tipo, quantidade, origem, observacao) values
  ('90000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'entrada', 18, 'Fornecedor XPTO [DEMO]', 'Carga inicial');

-- Entregas de exemplo (baixam estoque via trigger)
insert into ppe_deliveries (id, employee_id, obra_id, setor_responsavel_id, data) values
  ('a0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', current_date - interval '10 days');

insert into ppe_delivery_items (delivery_id, variant_id, quantidade, motivo) values
  ('a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 1, 'primeiro_fornecimento'),
  ('a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000005', 1, 'primeiro_fornecimento');

insert into inventory_movements (variant_id, obra_id, tipo, quantidade, referencia_tipo, referencia_id, observacao) values
  ('90000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'saida_entrega', 1, 'ppe_delivery', 'a0000000-0000-0000-0000-000000000001', 'Entrega inicial [DEMO]'),
  ('90000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'saida_entrega', 1, 'ppe_delivery', 'a0000000-0000-0000-0000-000000000001', 'Entrega inicial [DEMO]');

-- Exames — cobrindo vencido / vencendo / em dia
insert into exams (employee_id, tipo, data_exame, resultado, data_proximo_exame) values
  ('40000000-0000-0000-0000-000000000001', 'periodico', current_date - interval '11 months', 'apto', current_date - interval '15 days'), -- vencido
  ('40000000-0000-0000-0000-000000000005', 'periodico', current_date - interval '11 months', 'apto', current_date + interval '20 days'), -- vencendo
  ('40000000-0000-0000-0000-000000000006', 'admissional', current_date - interval '2 months', 'apto', current_date + interval '10 months'); -- em dia

-- Calcula os alertas iniciais a partir dos dados de demonstração
select recalcular_alertas();
