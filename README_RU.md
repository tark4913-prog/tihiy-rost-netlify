# Тихий рост — сайт для Netlify

Статический сайт с чат-консультантом на **Alice AI LLM Flash** через Yandex AI Studio. Дизайн и основной контент сохранены. Секреты не хранятся в файлах проекта.

## Публикация через GitHub и Netlify

1. Распакуйте ZIP в отдельную папку на компьютере. Это самостоятельный проект; он не изменяет ваш действующий сайт.
2. Создайте новый репозиторий на GitHub, например `tihiy-rost`, и загрузите в корень репозитория файлы `index.html`, `netlify.toml`, `README_RU.md` и папку `netlify/functions/chat.js`.
3. Войдите в Netlify и выберите **Add new site → Import an existing project** (название пункта может немного отличаться).
4. Подключите новый GitHub-репозиторий. Build command оставьте пустым; Publish directory укажите `.`. Конфигурация `netlify.toml` уже задаёт эти значения и каталог функций.
5. В настройках нового сайта Netlify откройте **Site configuration → Environment variables** и добавьте переменные ниже. Ограничьте доступ к ним production/deploy contexts по необходимости.
6. Запустите новый deploy (или дождитесь автоматического). Откройте опубликованный адрес и задайте чату вопрос, например: «Как поливать саженец лиственницы после доставки?».
7. Если функция возвращает ошибку, откройте раздел Functions/Logs в Netlify. Не публикуйте API-ключ в issue, логах, коммитах или сообщениях.

## Переменные окружения Netlify

- `YANDEX_API_KEY` — API-ключ сервисного аккаунта для Yandex AI Studio. Создайте его в консоли Yandex Cloud / AI Studio с правами для использования языковых моделей. **Не вставляйте ключ в файлы проекта.**
- `YANDEX_FOLDER_ID` — ID каталога Yandex Cloud, в котором доступна модель и которому выдана роль не ниже `ai.languageModels.user`.

После изменения переменных перезапустите deploy, если изменения не подхватились функцией.

## Проверенная интеграция API

Используется официальный OpenAI-совместимый Chat Completions API:
- Endpoint: `https://ai.api.cloud.yandex.net/v1/chat/completions`
- Модель: `gpt://<YANDEX_FOLDER_ID>/aliceai-llm-flash`
- Заголовки: `Authorization: Api-Key ...`, `OpenAI-Project: <YANDEX_FOLDER_ID>`, `Content-Type: application/json`
- Ответ читается из `choices[0].message.content`.

Источник: официальная документация Yandex AI Studio:
- Модели: https://aistudio.yandex.ru/ru/docs/ai-studio/concepts/generation/models
- Chat Completions API: https://aistudio.yandex.ru/ru/docs/ai-studio/api/Chat-Completions/createChatCompletion
- Пример базового запроса: https://aistudio.yandex.ru/ru/docs/ai-studio/operations/generation/completions-basic

## Чат и голос

- Чат отправляет сообщения на `/api/chat`, который перенаправляется в Netlify Function.
- Ввод ограничен 1200 символами на сообщение; сервер повторно проверяет входные данные и историю.
- Кнопка микрофона использует браузерный Web Speech API, если он поддерживается. Обычно требуется HTTPS и разрешение на микрофон.
- Кнопка динамика включает/выключает озвучивание ответов через `speechSynthesis`. Голосовые функции зависят от браузера и его установленных голосов; текстовый чат остаётся доступным.
- Вопросы по заказу, доставке и возвратам на Ozon направляются в чат конкретного заказа на Ozon.

## Что было проверено и что нет

Локально проверены структура архива, синтаксис JavaScript, конфигурация Netlify и наличие маршрута `/api/chat`. Также проверено соответствие модели, endpoint и формата Chat Completions текущей официальной документации.

**Не проверено реальным вызовом модели:** в окружении сборки нет вашего API-ключа и ID каталога. Поэтому доступность модели именно для вашего каталога, права, квоты и биллинг нужно проверить после добавления переменных в Netlify. Реальный API-тест не заявляется.
