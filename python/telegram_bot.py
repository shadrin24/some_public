from telegram import Bot
import asyncio


async def send_alert(bot_token, chat_id, message):
    bot = Bot(token=bot_token)
    # Максимальная длина сообщения в Telegram
    max_length = 4096

    # Разбиваем сообщение, если оно превышает допустимую длину
    if len(message) > max_length:
        parts = [message[i:i + max_length] for i in range(0, len(message), max_length)]
    else:
        parts = [message]

    # Отправляем каждую часть отдельно
    for part in parts:
        await bot.send_message(chat_id=chat_id, text=part)


# Функция для запуска корутины
async def main(bot_token, chat_id, message):
    try:
        await send_alert(bot_token, chat_id, message)
    except Exception as e:
        error_message = f"Произошла ошибка: {e}"
        # Отправляем текст ошибки в чат
        await send_alert(bot_token, chat_id, error_message)


# Запуск корутины
def run_alert(bot_token, chat_id, message):
    # print(bot_token, chat_id, message)
    asyncio.run(main(bot_token, chat_id, message))