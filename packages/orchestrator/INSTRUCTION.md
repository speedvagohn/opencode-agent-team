# orchestrator-handoff — конвейер разработки для opencode (агенты)

> 5 агентов pipeline: orchestrator (hub) → architect → executor → critic → reviewer.
> Только определения ролей, без MCP-инфраструктуры. Для полноты функций
> рекомендуется дополнить пакетом mcp-admin-handoff (поиск/память/браузер/docs/рассуждение).

## Состав
```
orchestrator-handoff/
├── INSTRUCTION.md
├── install.ps1
└── agent/            orchestrator.md, architect.md, executor.md, critic.md, reviewer.md
```

## Установка агентом (штатный сценарий)
Пользователь кидает этот архив любому агенту opencode с bash (build) и говорит
«установи». Агент: распаковать → прочитать INSTRUCTION.md → выполнить:
```powershell
powershell -ExecutionPolicy Bypass -File <распакованная\install.ps1>
```

## Установка руками
То же, одной командой выше.

## Что делает install.ps1
Копирует 5 файлов в `~/.config/opencode/agent/` (Windows: `%USERPROFILE%\.config\opencode\agent\`).
Ничего другого не трогает. Идемпотентен.

## После установки
**Перезапустить opencode.** Старт: `@orchestrator новый проект, папка <path>, хочу <что>`.

**Модельная политика зашита в агентов**: все 5 = `opencode/longcat-2.5-preview-free`. Другой провайдер — поправь/удали строки `model:` в agent/*.md.
Роли взаимодействуют через файлы `<project>/STATE/` (SPEC/TASKS/PROJECT_STATE) и
память — при отсутствии memory MCP оркестратор честно деградирует до файлов.

## Зависимости от второго пакета (что неполно без него)
| Функция роли | Требует MCP |
|---|---|
| чекпоинты/память | memory |
| context7 (docs), ddg (поиск) | context7, ddg-search |
| verification UI скринами | playwright |
| deep-reasoning протокол | sequentialthinking |
Все вызовы обёрнуты в «если инструмент доступен», отсутствие — не ошибка.
