# ⚠️ Arquitetura substituída — este diretório é histórico

Este projeto foi originalmente construído sobre **Supabase** (Postgres +
Auth + Storage + RLS), documentado nas 18 etapas do `SETUP.md` na raiz do
projeto.

A partir da migração para **Firebase**, este diretório (`supabase/`) deixou
de ser a fonte da verdade — ele fica aqui só como referência histórica:

- As regras de negócio (nunca estoque negativo, entrega atômica, devolução
  condicional, auditoria automática) foram todas **reimplementadas** em
  `/firebase/functions` (Cloud Functions), não apenas traduzidas de SQL.
- A RLS (`0002_rls.sql` e correções seguintes) virou `/firebase/firestore.rules`.
- Os 3 bugs reais encontrados pelos testes da Etapa 17 (`0013_fix_stock_trigger.sql`)
  já nasceram corrigidos na versão Firebase — o padrão "ler saldo → validar →
  só então escrever" usado nas Cloud Functions evita a classe de bug do
  `ON CONFLICT` por construção.
- O modelo de dados mudou de relacional para documentos — ver
  `/firebase/DATA_MODEL.md` para o mapeamento completo tabela → coleção.

Use `/firebase/` e o `SETUP.md` atualizado na raiz para rodar o projeto daqui
para frente.
