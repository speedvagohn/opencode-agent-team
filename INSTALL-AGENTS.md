# INSTALL-AGENTS.md — автономная установка команды агентов OpenCode

> **Для агента opencode на машине получателя.** Пользователь вставляет этот текст в чат (или говорит: «прочитай https://raw.githubusercontent.com/speedvagohn/opencode-agent-team/v1.0/INSTALL-AGENTS.md и выполни»). Твоя задача — **выполнить установку самому**, задав пользователю минимум вопросов. Ничего из «ручных шагов» на пользователя не перекладывай, кроме перезапуска приложения в конце.

---

## 0. Границы (соблюдать буквально)
- **Разрешено:** читать этот файл, клонировать репозиторий, доустанавливать зависимости, запускать `install.ps1`, проверять результат, писать отчёт.
- **Запрещено:** `git push` и любые изменения remote; запуск opencode с `--auto`; удаление или перезапись существующих чужих агентов/скиллов; выход за пределы задач этого файла; отправка чего-либо в сеть, кроме публикации пакетов npm/PyPI во время установки зависимостей.
- Если шаг не удался — не подбирай «силой», а доложи и предложи вариант.

## 1. Задать пользователю ровно 3 вопроса (и только их)
1. **Профиль установки** (от него зависит, что встанет на машину):
   - `agent-team` — всё: 6 агентов + 7 MCP + 2 скилла + правила (рекомендую);
   - `orchestrator` — только 5 агентов конвейера (MCP уже стоят / не нужны);
   - `mcp-admin` — 7 MCP + агент mcp-admin + скиллы (без конвейера разработки).
2. **Модель для агентов**: все файлы агентов содержат `model: opencode/space-bunny-free`. Спроси: «какая модель у тебя основная в opencode (например anthropic/claude-sonnet-4-6)?» Варианты ответа: своя модель → подставишь её; «не знаю / хочу как у сессии» → удалишь строки `model:` из копируемых файлов (агенты наследуют модель сессии).
3. **Unity** — задавай **только если** ты обнаружил установленную Unity (проверка в п.3). Тогда: «добавить unityMCP (нужен запущенный Unity с MCP-плагином на порту 8080)?»

Больше вопросов не задавай: профили Office, браузер, Node, bun, uv ты определяешь сам (п.3).

## 2. Получить исходники
```powershell
$dst = "$env:TEMP\opencode-agent-team-src"
if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
git clone --depth 1 --branch v1.0 https://github.com/speedvagohn/opencode-agent-team.git $dst
```
Зафиксируй в отчёте, какой коммит установлен: `git -C $dst rev-parse --short HEAD`.

## 3. Предусловия — проверь и почини сам
| Что | Проверка | Если нет — твои действия |
|---|---|---|
| opencode | установленное приложение/CLI | сообщи, что нужен opencode.ai, остановись |
| git | `git --version` | `winget install --id Git.Git -e` (или попроси поставить вручную) |
| Node.js | `node -v` | `winget install --id OpenJS.NodeJS.LTS -e`; затем **перезапусти PowerShell-контекст** (PATH) и повтори проверку; без Node MCP не поднимаются |
| PowerShell 5.1+ | `$PSVersionTable.PSVersion` | если ОС не Windows → переход к разделу 8 (ручной путь, сделай всё сам по нему) |
| Chrome или Edge | `Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe"` / `...Edge\Application\msedge.exe` | если нет — всё равно ставь, но в отчёте предупреди: MCP playwright будет настроен, но не запустится без браузера |
| MS Office | `Test-Path "...\Microsoft Office\root\Office16\WINWORD.EXE"` (и варианты Office15/16/x86) | если найден — установщик сам добавит MCP `OfficeMCP`; если нет — будет пропущено, это норма |
| Unity | `Test-Path "C:\Program Files\Unity\Hub\Editor"` или `Get-ChildItem "C:\Program Files\Unity*"` | если найдена → задай вопрос 3 |
| bun, uv | `bun --version`, `uvx --version` | установщик поставит сам; можешь заранее: `powershell -c "irm bun.sh/install.ps1 \| iex"`, `powershell -c "irm https://astral.sh/uv/install.ps1 \| iex"` |

## 4. Подготовка файлов под ответ пользователя
1. Скопируй `packages/<профиль>/` в рабочую папку (например `$env:TEMP\agents-install`).
2. **Модель**: если пользователь дал свою — замени строку `model: ...` во всех `agent/*.md` этой папки. Если выбран вариант «как у сессии» — удали эти строки. Покажи пользователю, что ты изменил (2-3 строки отчёта).
3. Если ответ на вопрос 3 «да» — передашь флаг `-IncludeUnity` в п.5.

## 5. Установка (Windows)
```powershell
powershell -ExecutionPolicy Bypass -File "$env:TEMP\agents-install\install.ps1"   # + -IncludeUnity при нужде
```
Что делает скрипт (для твоего отчёта): ставит bun/uv при отсутствии; копирует агентов в `~/.config/opencode/agent`, скиллы — в `skills`, инструкции — в корень конфига; разворачивает Bun+SQLite сервер памяти в `~/tools/memory-mcp` и прогоняет его тесты; создаёт `~/@Browser` и `~/.memory` (catch-all база памяти); дописывает MCP-секции в `~/.config/opencode/opencode.json`, **не трогая существующие**, с бэкапом `opencode.json.bak.*`. Идемпотентен — повторный запуск безопасен.

## 6. Проверка (обязательно, с фактами в отчёте)
1. JSON валиден: `Get-Content "$env:USERPROFILE\.config\opencode\opencode.json" -Raw | ConvertFrom-Json` без ошибок.
2. В `mcp` присутствуют: `ddg-search`, `playwright`, `memory`, `sequentialthinking`, `context7` (+ `OfficeMCP` если был Office; `unityMCP` если просил).
3. В `~/.config/opencode/agent/` — 6 `.md` (для профиля `orchestrator` — 5).
4. В `~/.config/opencode/skills/` — `memory-mcp\SKILL.md` и `deep-reasoning\SKILL.md` (для `orchestrator` их нет — это норма).
5. Живой тест MCP-памяти: вызови инструмент `memory_list_slices` с `cwd` = папка пользователя. Ожидание: пустой список `[]`. Ошибка = сервер не поднялся — сообщи и предложи прогнать `bun test` в `~/tools/memory-mcp`.
6. Сообщи итог одной таблицей: что установлено / что пропущено и почему / версия (sha).

## 7. Финал
Скажи пользователю ровно это:
> Готово. **Перезапусти opencode** (правки конфига и агентов читаются только при старте). После перезапуска: напиши `@orchestrator новый проект, папка <путь>, хочу <задачу>` — и дальше работай с ним: он сам ведёт план, задачи, проверки, историю и git. Мелкие разовые правки делай агентом `build`, настройку MCP — агентом `mcp-admin`.

## 8. Если ОС не Windows (делаешь сам, по шагам)
1. Зависимости: `curl -fsSL https://bun.sh/install | bash`; Node.js — из пакетного менеджера ОС; uv — `curl -LsSf https://astral.sh/uv/install.sh | sh`.
2. `cd "$dst/packages/<профиль>/memory-mcp" && bun install`.
3. Скопируй `agent/*.md` → `~/.config/opencode/agent/`, `skills/*` → `~/.config/opencode/skills/`, `instructions.md` → `~/.config/opencode/`.
4. Добавь в `~/.config/opencode/opencode.json` секцию `mcp` (формат — в `packages/<профиль>/INSTRUCTION.md`), с абсолютными путями и прямыми слешами:
   - `memory`: `["~/.bun/bin/bun", "<абс.путь>/packages/agent-team/memory-mcp/src/index.ts"]`, `timeout: 15000`;
   - `playwright`: `["npx","-y","@playwright/mcp","--browser","chrome","--caps","pdf","--headless","--output-dir","<абс.путь>/@Browser"]`;
   - `ddg-search`: `["uvx","--from","duckduckgo-mcp-server[browser]","duckduckgo-mcp-server"]`, `environment: {"DDG_REGION":"wt-wt","DDG_SAFE_SEARCH":"MODERATE"}`;
   - `sequentialthinking`: `["npx","-y","@modelcontextprotocol/server-sequential-thinking"]`;
   - `context7`: `["npx","-y","@upstash/context7-mcp"]`.
   Расширь `.` на абсолютные пути; сохрани существующие ключи и `$schema`.
5. Проверь как в п.6 (кроме OfficeMCP/unityMCP) и закончи фразой из п.7.

## 9. Типовые проблемы
| Симптом | Решение |
|---|---|
| `bun:sqlite` import error | `bun upgrade` |
| opencode не видит MCP | абсолютные пути прямыми слешами + перезапуск opencode |
| Timeout MCP | поднять `"timeout"` у этого сервера в opencode.json |
| Агент не появляется в списке | файл должен лежать в `~/.config/opencode/agent/<name>.md` с валидным frontmatter |
| Агент падает при старте | в frontmatter несуществующая модель → снять строку `model:` (п.4) |
| `memory_list_slices` → «No .memory/ found» | создать `~/.memory` (catch-all) или `<проект>/.memory` |
| Скрипт не запускается политикой | всегда `powershell -ExecutionPolicy Bypass -File ...` |
