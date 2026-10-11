# mcp-admin-handoff — все MCP-серверы + агент mcp-admin + скиллы памяти/рассуждения

> Один install.ps1 поднимает: ddg-search, playwright (Chrome/Edge), memory
> (Bun+SQLite сервер памяти), sequentialthinking, context7, OfficeMCP (если
> установлен MS Office), опционально unityMCP. Плюс агент mcp-admin (обезличенный)
> и скиллы memory-mcp + deep-reasoning, плюс правила параллельных вызовов.

## Состав
```
mcp-admin-handoff/
├── INSTRUCTION.md
├── install.ps1               ← вся установка одной командой
├── agent/mcp-admin.md        ← агент-администратор MCP/Windows (обезличен)
├── skills/memory-mcp/        ← конвенции персистентной памяти
├── skills/deep-reasoning/    ← протокол структурного рассуждения
├── instructions.md           ← глобальные правила параллельных tool-вызовов
└── memory-mcp/               ← Bun+SQLite MCP-сервер (исходник, без node_modules)
```

## Установка агентом (штатный сценарий)
Пользователь кидает архив любому агенту opencode с bash и говорит «установи».
Агент: распаковать → прочитать INSTRUCTION.md → выполнить:
```powershell
powershell -ExecutionPolicy Bypass -File <распакованная\install.ps1>   # + [-IncludeUnity] при нужде
```
Затем агент обязан верифицировать: opencode.json валиден; в mcp присутствуют
ddg-search, playwright, memory, sequentialthinking, context7 (+OfficeMCP если найден
Office); ~/.config/opencode/agent/mcp-admin.md на месте; оба SKILL.md на месте.
Сообщить пользователю: перезапустить opencode; unityMCP требует запущенную Unity
с MCP-плагином; semantic-поиск требует опциональный LLM-proxy на 127.0.0.1:3333.

## Установка руками
Та же команда выше.

## Детали install.ps1
- bun и uv ставит сам при отсутствии (официальные инсталлеры)
- npx берёт из PATH/ProgramFiles\nodejs; браузер: Chrome иначе Edge
- memory-сервер копируется в `~/tools/memory-mcp`, bun install + bun test
- создаёт `~/@Browser`, `~/.memory` (catch-all), `~/Documents\OfficeMCP` (если Office)
- opencode.json мержится (не трогает чужие секции/серверы), бэкап рядом
- идемпотентен, перезапускаем

## Требования
Node.js (единственное ручное), Windows PowerShell 5.1+, интернет на первый
прогон пакетов, opencode любой сборки (CLI или desktop).
