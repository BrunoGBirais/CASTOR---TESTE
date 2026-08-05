# Castor — Regras de Negócio (cópia em-repo)

Esta é uma cópia de [`../../RAG/regras_de_negocio_castor.md`](../../RAG/regras_de_negocio_castor.md) para referência humana dentro do repositório. A fonte canônica indexada pelo RAG é a versão em `RAG/`. Mantenha as duas em sincronia.

Veja o conteúdo completo em `RAG/regras_de_negocio_castor.md`.

## Resumo

- Fonte = arquivos no Drive (pasta source) **+ tabelas espelho/agregadas no Postgres** (`castor_src_sa1010`, `castor_src_sa3010`, `castor_src_za7010`, `castor_src_cc2010`, `castor_metrics_sf2010`, `castor_metrics_sc5010`). Upload pela tela admin substitui o conteúdo no Drive (mesmo `file_id`) e dispara ingest no Postgres (TRUNCATE+INSERT em transação).
- Cliente inativo elegível ⇔ `castor_src_sa1010.a1_ustatus = '2'`.
- Lead novo ⇔ ZA7010 sem CNPJ correspondente em SA1010.
- Feedback de visita: negativo/voltar_depois → +20 dias (ou `custom_days`); convertido → `next_contact_at=NULL`, só volta se status retornar a '2'.
- Porte: MEI/ME=pequeno, EPP=medio, DEMAIS=grande. Cache RF 30 dias. Histórico 12m calculado em `castor_metrics_sf2010` (ticket médio).
- Roteirização: nearest-neighbor Haversine a partir do depósito Diadema/SP (lat -23.6884, lng -46.6178).
- Visibilidade: admin vê tudo; vendedor vê apenas onde `a1_vend = castor_my_vendor_code()`.
- Camada analítica (migration 037): SD2010 (itens de NF) alimenta `castor_metrics_produto*`, `castor_metrics_mensal`, `castor_metrics_venda_cliente`. Faturamento conta só **venda**. SA1010 vira cadastro mestre (`castor_cliente_enriquecido`). RPCs/tools: `get_product_mix`, `get_top_products`, `get_top_groups`, `get_sales_trend`, `get_crosssell_suggestions`, `get_client_status_history`. Front: aba **Produtos**.
- Definição de venda (migration 061): `castor_operacao_class(d2_tes, d2_cf)` classifica pelo **TES** (`D2_TES` → `SF4010`) — venda = saída que gera duplicata (`F4_DUPLIC='S'`); entrada (`F4_TIPO='E'`) = devolução; saída sem duplicata = bonificação/transferência. Só por CFOP não serve: bonificação sai com CFOP de venda (5102/6102). `castor_cfop_class` vira **fallback** (TES ausente do SF4010 ou `f4_duplic` ainda não sincronizado). Exceções em `castor_tes_override`.
- ⚠️ `faturamento_12m` / `pedidos_12m` / `ticket_medio_12m` / `faturamento_alltime` vêm de SF2010 (cabeçalho) e **não têm filtro de operação** — somam bonificação, devolução e transferência. São métricas de porte/atividade, não de venda líquida; divergem do `get_sales_trend` de propósito.
- RAG: pasta dedicada `1Azpe9hHXObz93rio04AVWuUxGOlUlbjj`. Update via `files.update` no mesmo `file_id`. Nunca `files.delete`.
