# Migração Supabase → Firebase — Modelo de Dados

## Por que isso não é uma troca de SDK

O Postgres/Supabase dava de graça: transações ACID multi-tabela, `CHECK`
constraints, triggers automáticos, RLS linha-a-linha, e `JOIN` para juntar
colaborador+empresa+setor numa query. O Firestore é um banco de documentos —
sem joins, sem constraints declarativos, sem transação SQL. Cada uma dessas
garantias precisa ser **reimplementada explicitamente**:

| Garantia no Postgres | Equivalente no Firebase |
|---|---|
| RLS por perfil | Firestore **Security Rules** (`firestore.rules`) |
| Trigger de auditoria | **Cloud Function** `onDocumentWritten` |
| Função transacional (`registrar_entrega`) | **Cloud Function callable** com `runTransaction` |
| `CHECK (quantidade_atual >= 0)` | Validação dentro da transação da Cloud Function |
| `auth.uid()` / `auth_user_role()` | Custom Claims do Firebase Auth + leitura de `users/{uid}` |
| Storage privado + signed URL | Firebase Storage + Security Rules + `getDownloadURL` |
| Bucket `employee-photos` / `ppe-photos` | Mesma estrutura, paths `employee-photos/{obraId}/{uid}.ext` |

**Decisão de arquitetura**: toda escrita que precisa ser atômica ou validada
(entrega, devolução, entrada de estoque, mudança de perfil de usuário) passa
por uma **Cloud Function callable**, nunca escrita direta do cliente. Isso
recria o que as `SECURITY DEFINER functions` faziam no Postgres. Leituras
continuam diretas do cliente via Firestore SDK, protegidas por Security Rules.

## Coleções

### `obras/{obraId}`
```
{ nome, codigo, endereco, responsavel, status, dataInicio, dataTerminoPrevista, createdAt }
```

### `users/{uid}` (uid = Firebase Auth UID)
```
{ nome, email, perfil: 'admin'|'almoxarifado'|'seguranca'|'gestor'|'consulta', status: 'ativo'|'inativo', createdAt }
```
O perfil também é espelhado como **Custom Claim** (`{ perfil, status }`) no
token do Firebase Auth pela Cloud Function `onUserProfileWritten`, para que as
Security Rules consigam checar o perfil sem uma leitura extra ao Firestore
(`request.auth.token.perfil`).

### `companies/{id}`, `sectors/{id}`, `jobFunctions/{id}`
```
{ obraId (companies/sectors só), nome, cnpj?, responsavel?, contato?, status }
```

### `employees/{id}`
```
{
  obraId, companyId, sectorId, jobFunctionId, fotoPath,
  nomeCompleto, matricula, cpf, dataAdmissao, dataDesligamento,
  responsavelImediato, contato,
  situacao: 'ativo'|'ferias'|'afastamento'|'desligado',
  createdAt, updatedAt
}
```
Subcoleção **`employees/{id}/statusHistory/{autoId}`**: `{ situacaoAnterior, situacaoNova, usuarioId, data }`.
Substitui `employee_status_history` — escrita só pela Cloud Function
`onEmployeeWritten` (equivalente ao trigger `log_employee_status_change`).

Unicidade de matrícula por obra: Firestore não tem `UNIQUE` — a Cloud Function
`criarColaborador` faz a checagem dentro de uma transação antes de gravar.

### `employees/{id}/exams/{autoId}`
```
{ tipo, dataExame, resultado, dataProximoExame, observacoes, anexoPath, usuarioId, createdAt }
```

### `ppeCategories/{id}` → `{ nome }`

### `ppeAttributes/{id}` → `{ nome }` (vocabulário global, ex: "Cor", "Tamanho")

### `ppeItems/{id}`
```
{
  obraId, categoriaId, nome, codigoInterno, descricao, fabricante, modelo,
  caNumero, caValidade, estoqueMinimo, unidadeMedida, fotoPath, status, observacoes,
  attributeIds: [attrId, ...]   // substitui ppe_item_attributes
}
```

### `ppeItems/{itemId}/variants/{variantId}`
Aqui a desnormalização é a mudança mais importante: em vez de 3 tabelas
(`ppe_variants`, `ppe_attribute_values`, `ppe_variant_values`), cada variante
já guarda seus valores de atributo embutidos:
```
{
  skuGerado, status,
  attributeValues: [ { attributeId, attributeNome, valor }, ... ]
}
```
Os "valores possíveis" de cada atributo (ex.: Cor → Branco, Amarelo) ficam em
**`ppeAttributes/{attrId}/values/{valueId}`** → `{ valor }`, só para alimentar
os `<select>` do formulário — não são mais referenciados por FK, são copiados
(denormalizados) para dentro da variante no momento da criação.

### `inventory/{variantId}` (saldo — chave é o próprio ID da variante)
```
{ ppeItemId, obraId, quantidadeAtual }
```
Só escrita pelas Cloud Functions transacionais (`registrarEntrada`,
`registrarEntrega`, `registrarDevolucao`) — nunca pelo cliente diretamente.

### `inventoryMovements/{autoId}`
```
{ variantId, obraId, tipo, quantidade, data, usuarioId, origem, referenciaTipo, referenciaId, observacao, createdAt }
```
Somente-inserção, nunca editado/apagado (mesma regra da seção 36).

### `ppeDeliveries/{id}`
```
{ employeeId, obraId, usuarioId, setorResponsavelId, data, hora, observacao, situacaoColaboradorSnapshot, createdAt }
```
Subcoleção **`ppeDeliveries/{id}/items/{autoId}`**: `{ variantId, quantidade, motivo }`.

### `ppeReturns/{id}`
```
{ employeeId, variantId, quantidade, data, motivo, condicao, usuarioId, retornouAoEstoque }
```

### `alerts/{autoId}`
```
{ tipo, referenciaTipo, referenciaId, gravidade, status, dataGeracao, dataResolucao }
```
Gerada pela Cloud Function agendada `recalcularAlertas` (equivalente à
`recalcular_alertas()` do Postgres) — roda a cada hora via Cloud Scheduler, e
também pode ser chamada sob demanda (callable).

### `auditLogs/{autoId}`
```
{ usuarioId, data, acao, modulo, registroId, dadosAnteriores, dadosNovos }
```
Gerada por Cloud Functions `onDocumentWritten` nas coleções sensíveis
(`employees`, `ppeItems`, `inventoryMovements`, `ppeDeliveries`, `users`).

### `settings/{obraId}`
```
{ diasAlertaCa, diasAlertaExame, nomeObraExibido, logoPath }
```

## Storage

```
employee-photos/{obraId}/{arquivo}
ppe-photos/{obraId}/{arquivo}
```
Mesma estrutura de paths do Supabase Storage, mas Security Rules do Firebase
Storage em vez de policies de `storage.objects`.
