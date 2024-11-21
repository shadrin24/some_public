import requests
import pandas as pd
import boto3
from botocore.client import Config
from telegram_bot import run_alert  # Предполагается, что у вас есть эта функция

# Параметры Telegram и API
bot_token = '123:123'
telegram_id = '-123'

# Настройки для подключения к Object Storage
bucket_name = 'ids'
object_name = 'last_id.txt'

session = boto3.session.Session()
s3 = session.client(
    service_name='s3',
    endpoint_url='https://storage.yandexcloud.net',  # Указываем URL Yandex Object Storage
    aws_access_key_id='123',
    aws_secret_access_key='13-132',
    config=Config(signature_version='s3v4')
)


# Получение значения last_id из файла в Yandex Object Storage
def get_last_id():
    try:
        response = s3.get_object(Bucket=bucket_name, Key=object_name)
        content = response['Body'].read().decode()
        return int(content)
    except Exception as e:
        print(f"Не удалось получить last_id: {e}")
        return 0  # Возвращаем 0, если файл не найден или произошла ошибка


# Сохранение значения last_id в файл в Yandex Object Storage
def update_last_id(last_id):
    try:
        s3.put_object(Bucket=bucket_name, Key=object_name, Body=str(last_id).encode())
    except Exception as e:
        print(f"Не удалось сохранить last_id: {e}")


def main(event, context):
    def check_for_new_trades():
        last_id = get_last_id()  # Получаем last_id из Yandex Object Storage
        print(last_id)
        baseURL = 'http://123/api'
        url = f'{baseURL}/trades/get_after_id/{last_id}'

        try:
            # Отправка GET-запроса к API
            response = requests.post(url)

            # Проверка статуса ответа
            if response.status_code == 200:
                # Обработка JSON-ответа
                trades = response.json()
                new_trades_df = pd.json_normalize(trades)

                if not new_trades_df.empty:
                    trades_str = ''
                    for _, row in new_trades_df.iterrows():
                        last_id = max(last_id, row['id'])  # Обновляем last_id
                        time = row['time']
                        buy_sell = 'Покупка' if row['buysell'] == 'B' else 'Продажа'
                        ticker = row['ticker']
                        price = row['price']
                        quantity = row['quantity']
                        value = row['value']
                        currentpos = row['currentpos']
                        trades_str += f'{time} {buy_sell}: {ticker} ({price} x {quantity} = {value}) currentpos={currentpos}\n'

                    # Удалить последний символ новой строки
                    trades_str = trades_str.rstrip('\n')

                    # Отправить уведомление в Telegram
                    run_alert(bot_token, telegram_id, trades_str)
                    print("Сообщение отправлено в Telegram:", trades_str)
                    update_last_id(last_id)  # Сохраняем новый last_id в Yandex Object Storage
                else:
                    print("Новых записей нет.")

            else:
                run_alert(bot_token, telegram_id, f"Ошибка: {response.status_code}")
                print(f"Ошибка: {response.status_code}")

        except requests.exceptions.RequestException as e:
            run_alert(bot_token, telegram_id, f"Произошла ошибка при обращении к API: {e}")
            print("Произошла ошибка при обращении к API:", e)

    # Сразу выполняем проверку
    check_for_new_trades()


main('', '')
