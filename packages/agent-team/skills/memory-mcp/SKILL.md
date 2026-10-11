---
name: memory-mcp
description: Persistent agent memory over SQLite (MCP server "memory", tools memory_*). Use to save/retrieve knowledge across sessions: task context, decisions (ADR), component facts, TODO capture, compaction recovery. Triggers: "remember", "what did we decide about X", "restore task context", TODO/FIXME markers in code or chat, session start with a ticket ID.
---

# Memory MCP

MCP-сервер `memory`: граф знаний в SQLite — entities + observations + relations,
разделённые на slices. База `.memory/memory.db` ищется от cwd вверх по дереву
(как npm ищет node_modules). Одна база на workspace/проект.

## slice_id — обязательный параметр

Обязателен для всех tools кроме `list_slices`.

- Данные конкретной задачи → slice_id = ID тикета (`DE-3549`, `MAIL-1234`)
- Cross-task знания (архитектура, patterns, ADR, component facts) → slice_id = `"default"`
- ID задачи неизвестен → `"default"`

## Маршрутизация tools

| Задача | Tool | Примечание |
|---|---|---|
| Что есть в базе | `list_slices` | Первый вызов сессии |
| Точный факт (путь, версия, хэш, credential) | `semantic_search` → `open_nodes` | Быстро (~300ms), без галлюцинаций; кросс-языковой (RU запрос находит EN контент) |
| Поиск по ключевому слову | `search_nodes` | LIKE по name/type/content |
| Синтез ("что сделано", "почему", обзор, root cause) | `summarize_slice` | Медленно (warm 5–30s), требует LLM proxy; НЕ использовать в compaction recovery |
| Сущности по именам | `open_nodes` | По умолчанию 50 последних observations на entity; `max_observations_per_entity=0` = все |
| Весь граф | `read_graph` | Только для slices < 5 entities, иначе переполнение контекста |
| Запись | `create_entities`, `add_observations`, `create_relations` | Idempotent |
| Удаление | `delete_entities`, `delete_observations`, `delete_relations` | Destructive |

Принцип: **файлы — source of truth, MCP — индекс/указатели**. Observation содержит
pointer (`→path/to/artifact.md`), не дублирует содержимое файла. При расхождении — верить файлу.

Смешанный запрос (факт + синтез): сначала `semantic_search`; если недостаточно —
эскалация к `summarize_slice`. При `degradedReason=timeout` не ретраить сразу — ждать 2–3 минуты.

## Формат observation (канонический)

```
<ISO timestamp, минута> | <STATUS> | <source> | <essence>
```

- timestamp: `2026-07-23T14:30`
- STATUS: `PENDING` / `DONE` / `WONTFIX`
- source: `file:line` | `chat` | `artifact:<path>` | `skill:<name>` | `task:<id>`
- essence: одна фраза ≤120 символов; длиннее → pointer на файл

Пример:

```
2026-07-23T14:30 | PENDING | file:src/db.ts:72 | hardcoded regex блокирует вложенные .memory/
```

## TODO capture

Триггер-слова (только явные маркеры): `TODO`, `FIXME`, `HACK`, `XXX`, `ТУДУ`.

| Уровень | Entity | slice_id |
|---|---|---|
| Задача | `todo-log` | ID тикета |
| Проект | `todo-backlog` | `default` |

Поведение: извлечь essence одной фразой → `add_observations` → продолжить основную
работу → уведомление одной строкой `ℹ️ TODO captured: <essence>`.
Обновление статуса: `delete_observations` (старая) → `add_observations` (новая с DONE/WONTFIX).
При закрытии задачи — промотировать важные нерешённые TODO из `todo-log` в `todo-backlog`.

## Session startup / compaction recovery

1. `list_slices(cwd=...)` — какие slices существуют
2. `semantic_search(cwd=..., slice_id="<TASK-ID>", query="task context summary", top_k=5)` — контекст задачи
3. `open_nodes` по найденным именам — детали
4. `read_graph` только если slice маленький (<5 entities)

## Запрещено хранить

- Секреты: API keys, tokens, пароли, connection strings
- Полный исходный код компонентов (только атомарные факты)
- Session logs / prompt history / промежуточные рассуждения (для этого temp/tasks/<ID>/)
- `.memory/` внутри папок с исходниками приложения — только корень workspace/проекта
