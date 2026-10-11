# agent-team handoff — конвейер «оркестратор» для opencode

> Переносная система агентов для разработки проектов: orchestrator (hub) →
> architect → executor → critic → reviewer, + память (SQLite MCP), веб-поиск,
> браузер, версионированная документация библиотек, структурированное рассуждение.
> Собрано 2026-10-06. Система НЕ привязана к проекту/стеку/имени пользователя.

## 1. Состав архива

```
agent-team-handoff/
├── INSTRUCTION.md          ← этот файл
├── install.ps1             ← установщик (идемпотентен, бэкапит конфиг)
├── agent/                  ← 6 агентов (mode: primary у orchestrator/mcp-admin)
│   ├── orchestrator.md     ← hub: координирует, чекпоинтит, гейты пользователя
│   ├── architect.md        ← SPEC + декомпозиция TASK-NN + acceptance criteria
│   ├── executor.md         ← одна подзадача, verification обязателен
│   ├── critic.md           ← review плана и результатов, claims-only, tier-глубина
│   ├── reviewer.md         ← финальное интеграционное ACCEPT/REJECT
│   └── mcp-admin.md        ← администратор MCP/Windows (вне конвейера)
├── skills/
│   ├── memory-mcp/SKILL.md       ← правила работы с persistent памятью
│   └── deep-reasoning/SKILL.md   ← авто-протокол структурного рассуждения
├── instructions.md         ← глобальные правила параллельных tool-вызовов
└── memory-mcp/             ← Bun+SQLite сервер памяти (исходник, без node_modules)
```

## 2. Требования к машине

| Компонент | Зачем | Проверка |
|---|---|---|
| opencode | хост агентов | запуск приложения |
| Node.js | npx-серверы (playwright, sequential-thinking, context7) | `node -v` |
| bun | memory-mcp (bun:sqlite) | install.ps1 ставит сам |
| uvx | ddg-search сервер | install.ps1 ставит сам |
| Edge или Chrome | playwright MCP управляет установленным браузером | install.ps1 определит сам |

## 3. Установка

```powershell
Expand-Archive agent-team-handoff.zip -DestinationPath C:\ -Force
cd C:\agent-team-handoff
powershell -ExecutionPolicy Bypass -File install.ps1
```

## 3a. Установка «силами агента» (без рук пользователя)

Распакуй архив и вставь свенему opencode (любой агент с bash, например build):

> «В папке <path-к-распакованному-архиву> лежит handoff системы агентов. Прочитай
> INSTRUCTION.md, выполни install.ps1 через powershell -ExecutionPolicy Bypass
> (добавь -IncludeUnity, если у меня стоит Unity с MCP-плагином), затем проверь:
> opencode.json валиден, в mcp присутствуют ddg-search/playwright/memory/
> sequentialthinking/context7 (+OfficeMCP если найден Office), в
> ~/.config/opencode/agent лежат 6 md-файлов, в skills — memory-mcp и
> deep-reasoning. Сообщите результат и что требуется перезапустить opencode.»

Агент сделает всё сам; пользователю остаётся только перезапуск приложения.

## 3b. Установка руками

```powershell
Expand-Archive agent-team-handoff.zip -DestinationPath C:\ -Force
cd C:\agent-team-handoff
powershell -ExecutionPolicy Bypass -File install.ps1   # + [-IncludeUnity]
```

## 3. Детали установки

Скрипт: копирует агентов/скиллы/инструкции в `~/.config/opencode/`, ставит bun и
(при отсутствии), раскладывает memory-mcp в `~/tools/memory-mcp` (bun install +
тесты), создаёт `~/@Browser` и `~/.memory`, дописывает нужные MCP-серверы в
`opencode.json` **не трогая существующие** (бэкап `opencode.json.bak.*`).
Можно перезапускать поверх уже настроенной машины.

## 4. Первый запуск

1. Перезапусти opencode.
2. `@orchestrator новый проект, папка C:\path\to\project, хочу <что построит>`
3. Дальше система сама: интервью архитектора → гейт плана → параллельные
   исполнители → критик (≤2 итерации) → ревьюер → финальный гейт.
   Ты только отвечаешь на вопросы и принимаешь гейты.
4. Состояние: `<project>/STATE/PROJECT_STATE.md`; память: `<project>/.memory/`.

## 5. Что переносится условно / не переносится

- `OfficeMCP` — ставится только если на целевой машине реально найден MS Word
  (детект по WINWORD.EXE); создаётся папка `~/Documents\OfficeMCP`.
- `unityMCP` — только с флагом `-IncludeUnity`; сам Unity+плагин не переносятся
  (переустанови плагин Unity MCP внутри проекта Unity).
- Содержимое памяти (slice'ы) — начинается с чистой базы.
- LLM-proxy для `semantic_search`/`summarize_slice`: работает без него
  (graceful degradation); для полноценной семантики нужен OpenAI-compatible
  endpoint на `127.0.0.1:3333` (ollama + bge-m3) — опционально.

## 6. Известные особенности

- **Модельная политика зашита в агентов**: все 6 = `opencode/space-bunny-free`. Если на целевой машине другой провайдер — поправь строки `model:` в `agent/*.md` (или удали их — унаследуется модель сессии). Историческая справка: до 2026-10-11 использовался предыдущий провайдер, его ключ отозвали (HTTP 401).
- Лимиты артефактов (SPEC ≤10 КБ, бриф ≤4 КБ, отчёты в отдельных result/review-файлах) и evidence-лимиты (≤3 скриншота на TASK) — в промптах ролей, не ослабляй без причины: раздувание контекста линейно замедляет каждый холодный старт.

- Права: у субагентов edit ограничен STATE/ (кроме executor — он пишет код);
  у orchestrator bash allow с deny на деструктив. Осознанный компромисс
  автономность/безопасность.
- `install.ps1` правит только opencode.json; если проект-специфичный
  `./opencode.json` переопределяет глобальный — mcp-секции сольются по правилам
  opencode (проект поверх глобала).
- Файлы агентов — markdown frontmatter; правь промпты свободно, после правок
  рестарт opencode.
- Tier-правила критика/архитектора (fast/Standard/heavy) унаследованы из
  эмпирики strict-plan-review v2.3 (recall дешёвых моделей 39% vs 57% на
  open-ended задачах) — не упрощай без замеров.

## 7. Удаление

```powershell
# убери из opencode.json секции mcp: ddg-search, playwright, memory,
# sequentialthinking, context7 (файл-бэкап рядом)
Remove-Item "$env:USERPROFILE\.config\opencode\agent\{orchestrator,architect,executor,critic,reviewer,mcp-admin}.md"
Remove-Item -Recurse "$env:USERPROFILE\.config\opencode\skills\{memory-mcp,deep-reasoning}"
Remove-Item -Recurse "$env:USERPROFILE\tools\memory-mcp"   # код сервера
# .memory/ базы в проектах — удаляй отдельно (это данные)
```
