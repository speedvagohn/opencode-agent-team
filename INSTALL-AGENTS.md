# INSTALL-AGENTS.md — автономная установка команды агентов OpenCode

> **Для агента opencode на машине получателя.** Пользователь вставляет этот текст в чат (или говорит: «прочитай https://raw.githubusercontent.com/speedvagohn/opencode-agent-team/<ТЕГ>/INSTALL-AGENTS.md и выполни»). Твоя задача — **выполнить установку самому**, задав пользователю минимум вопросов. Ничего из «ручных шагов» на пользователя не перекладывай, кроме перезапуска приложения в конце.

---

## 0. Границы (соблюдать буквально)

Если ты не можешь открыть ссылку на этот файл (нет инструмента webfetch или сеть закрыта) — попроси пользователя вставить содержимое файла в чат и продолжай работать по нему.
- **Разрешено:** читать этот файл, клонировать репозиторий, доустанавливать зависимости, запускать `install.ps1`, проверять результат, писать отчёт.
- **Запрещено:** `git push` и любые изменения remote; запуск opencode с `--auto`; удаление или перезапись существующих чужих агентов/скиллов; выход за пределы задач этого файла; отправка чего-либо в сеть, кроме публикации пакетов npm/PyPI во время установки зависимостей.
- Если шаг не удался — не подбирай «силой», а доложи и предложи вариант.

## 1. Один вопрос о составе установки
Спроси пользователя **одним вопросом**: «что ставим?» и предложи варианты:

| Ответ | Профиль | Ключи установки |
|---|---|---|
| **«Всё сразу»** (рекомендую) | `agent-team` | без флагов — ставится всё |
| «Только конвейер агентов, без MCP» | `agent-team` | `-Skip mcp` |
| «Только MCP и админ, без конвейера разработки» | `mcp-admin` | без флагов |
| «Свой набор» — перечислил компоненты | по таблице ниже | собери `-Skip` из неперечисленных |

**Если выбрано «Всё сразу» — больше НИ ОДНОГО вопроса не задавай** (кроме модели, и то только если пользователь сам её не указал: по умолчанию сними строки `model:` из агентов, чтобы они наследовали модель сессии). Не переспрашивай про каждый MCP по отдельности — собери один список и установи.

Компоненты для «своего набора» и соответствующие ключи:

| Компонент | Ключ `-Skip` | Что это |
|---|---|---|
| Агенты конвейера | `agents` | orchestrator, architect, executor, critic, reviewer (+ mcp-admin в профиле agent-team) |
| Агент mcp-admin (профиль mcp-admin) | `admin` | администратор MCP и ОС |
| Скиллы | `skills` | memory-mcp, deep-reasoning |
| Глобальные правила | `instructions` | инструкция по параллельным вызовам инструментов |
| MCP-память | `memory` | Bun+SQLite, история/знания между сессиями |
| Веб-поиск | `ddg` | DuckDuckGo-поиск и чтение страниц |
| Браузер | `playwright` | Playwright MCP (Edge/Chrome, headless) |
| Документация библиотек | `context7` | Context7 (версионированные доки) |
| Структурированное рассуждение | `sequentialthinking` | Sequential Thinking MCP |
| Office (Word/Excel) | `office` | MCP автоматизирования Office (нужен MS Office) |
| Unity | `unity` | MCP Unity (нужен запущенный Unity с плагином) |
| **Все MCP разом** | `mcp` | короткий синоним: `-Skip mcp` = не ставить ни одного MCP |

Примеры готовых команд:
```powershell
# только агенты, без MCP, скиллов и правил
powershell -ExecutionPolicy Bypass -File install.ps1 -Skip "mcp,skills,instructions"
# всё, кроме памяти и Office
powershell -ExecutionPolicy Bypass -File install.ps1 -Skip "memory,office"
# только поиск и браузер (всё остальное не нужно)
powershell -ExecutionPolicy Bypass -File install.ps1 -Skip "agents,skills,instructions,memory,context7,sequentialthinking,office"
```

Дополнительно спроси (только если применимо):
- **Unity** — задавай вопрос **только если** сам обнаружил установленную Unity (проверка в п.2); при «да» добавь `-IncludeUnity`.

## 2. Предусловия — сначала проверь и почини, потом что-либо качай
| Что | Проверка | Если нет — твои действия |
|---|---|---|
| opencode | приложение/CLI установлено (ты в нём и работаешь) | сообщи, что нужен opencode.ai, и остановись |
| git | `git --version` | `winget install --id Git.Git -e`. Если winget нет или установка не удалась — **не блокируйся**: работай по запасному пути п.3Б (скачай zip напрямую, git не нужен) |
| Node.js | `node -v` | `winget install --id OpenJS.NodeJS.LTS -e`, затем перезапусти PowerShell (PATH) и повтори проверку. Нужен **только** если ставим npx-MCP (playwright/context7/sequentialthinking); при `-Skip` этих компонентов — не нужен |
| PowerShell 5.1+ | `$PSVersionTable.PSVersion` | если ОС не Windows → раздел 8 (ручной путь, делай всё сам) |
| Chrome или Edge | `Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe"` / `...Edge\Application\msedge.exe` | нет — всё равно ставь, но предупреди в отчёте: playwright настроен, но без браузера не запустится |
| MS Office | `Test-Path "...\Microsoft Office\root\Office16\WINWORD.EXE"` (+ Office15/16, x86) | найден → установщик добавит `OfficeMCP`; не найден → пропуск, это норма |
| Unity | `Test-Path "C:\Program Files\Unity\Hub\Editor"` | найдена → задай вопрос про unityMCP и при «да» передашь `-IncludeUnity` |
| bun, uv | `bun --version`, `uvx --version` | ставит установщик сам; можешь заранее: `powershell -c "irm bun.sh/install.ps1 \| iex"`, `powershell -c "irm https://astral.sh/uv/install.ps1 \| iex"` |

**Ожидай диалоги подтверждений:** на чистой машине запись в `~/.config/opencode`, `~/tools`, `~/@Browser` идёт **за пределами рабочей папки** opencode, поэтому пользователь увидит несколько запросов разрешения на файловые операции. Это нормально: разрешай пути вида `%USERPROFILE%\.config\opencode\...` и `%USERPROFILE%\tools\...`; всё остальное (сеть, `git push`, `--auto`) по-прежнему запрещено разделом 0.

## 3. Получить исходники
### Как определить `<ТЕГ>`
Подставь версию из ссылки, по которой ты получил эту инструкцию: в адресе вида
`https://raw.githubusercontent.com/speedvagohn/opencode-agent-team/<ТЕГ>/INSTALL-AGENTS.md`
это последний сегмент перед `INSTALL-AGENTS.md`. Все команды и ссылки на zip бери **того же тега** —
артефакты разных тегов несовместимы (в ранних версиях был сломан установщик).

### 3А. Основной путь — git есть
```powershell
$dst = "$env:TEMP\opencode-agent-team-src"
if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
git clone --depth 1 --branch <ТЕГ> https://github.com/speedvagohn/opencode-agent-team.git $dst
git -C $dst rev-parse --short HEAD      # зафиксируй sha в отчёте
```

### 3Б. Запасной путь — git недоступен (чистая машина без git/winget)
Скачай готовый zip напрямую (git не нужен):
```powershell
$zipUrl = "https://raw.githubusercontent.com/speedvagohn/opencode-agent-team/<ТЕГ>/dist/<zip-файл>"
$dst = "$env:TEMP\opencode-agent-team-zip"
if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Invoke-WebRequest -Uri $zipUrl -OutFile "$dst\pkg.zip"
Expand-Archive "$dst\pkg.zip" -DestinationPath "$dst\pkg" -Force
```
`<zip-файл>` по профилю: `agent-team` → `agent-team-handoff.zip`, `orchestrator` → `orchestrator-handoff.zip`, `mcp-admin` → `mcp-admin-handoff.zip`. Дальше работаешь из `$dst\pkg` (там уже лежат `install.ps1`, `agent\`, `skills\`).
Если и `Invoke-WebRequest` не проходит (прокси/сеть) — попроси пользователя скачать zip вручную по ссылке из README и указать путь.

## 4. Подготовка файлов под ответ пользователя
1. Скопируй `packages/<профиль>/` в рабочую папку (например `$env:TEMP\agents-install`).
2. **Модель**: если пользователь дал свою — замени строку `model: ...` во всех `agent/*.md` этой папки. Если выбран вариант «как у сессии» — удали эти строки. Покажи пользователю, что ты изменил (2-3 строки отчёта).
3. Если ответ на вопрос 3 «да» — передашь флаг `-IncludeUnity` в п.5.

## 5. Установка (Windows)
```powershell
powershell -ExecutionPolicy Bypass -File "<путь-к-install.ps1>\install.ps1"   # + -IncludeUnity при нужде
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
