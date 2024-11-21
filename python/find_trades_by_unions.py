import requests
import pandas as pd
import json
import numpy as np

# URL API-ресурса
baseURL = 'http://123/api'
url = f'{baseURL}/trades/get_all'
# url = f'{baseURL}/trades/get_after_id/0'
# url = f'{baseURL}/trades/get_by_union_ticker'
# url = f'{baseURL}/trades/get_by_unions_and_times'
# url = f'{baseURL}/trades/get_by_unions'

# Установить параметры отображения всех столбцов
pd.set_option('display.max_columns', None)  # Отображать все столбцы
pd.set_option('display.expand_frame_repr', False)  # Отключить перенос строк
# params = {
#     'unions': ['123'],
#     # 'union': '123',
#     # 'ticker': 'TQBR/MTLR'
# }


def delete_first_curpos_zero(df):
    df = df.copy()
    # Преобразуем столбец `time` в формат datetime, если это еще не сделано
    df['time'] = pd.to_datetime(df['time'])
    df = df.sort_values(by=['time', 'tradeno'], ascending=True)
    # Инициализация для накопления строк и суммы currentpos
    rows_to_delete = []  # Индексы строк для удаления
    quantity_sum = 0
    was_zero = False

    for index, row in df.iterrows():
        # Проверка, если текущий currentpos == 0
        if row['currentpos'] != 0 and was_zero:
            # Если сумма не равна 0 и нулевые позиции уже были, удаляем накопленные строки
            if quantity_sum != 0:
                df.drop(rows_to_delete, inplace=True)
                quantity_sum = 0
                was_zero = False
                rows_to_delete = []
            else:
                # Если сумма равна 0, прекращаем цикл
                break
        if row['buysell'] == 'B':
            quantity_sum += row['quantity']
        else:
            quantity_sum -= row['quantity']
        rows_to_delete.append(index)
        if row['currentpos'] == 0 and not was_zero:
            was_zero = True

    return df.reset_index(drop=True)


def concat_parts_of_trades(df):
    # Определяем функцию для currentpos с учетом значения в столбце buysell
    def custom_currentpos(series, buysell_series):
        if buysell_series.iloc[0] == 'S':
            return series.min()
        else:
            return series.max()
    # Применяем groupby с агрегированием
    df = df.groupby('orderno').agg({
        'id': 'last',
        'type': 'last',
        'orderno': 'last',
        'secid': 'last',
        'union': 'last',
        'ticker': 'last',
        'client': 'last',
        'buysell': 'last',
        'value': 'sum',  # Сумма по value
        'price': 'mean',  # Среднее по price
        'quantity': 'sum',  # Сумма по quantity
        'time': 'last',
        'status': 'last',
        'currentpos': lambda x: custom_currentpos(x, df.loc[x.index, 'buysell']),
        'comission': 'sum',  # Сумма по comission
        'tradeno': 'last',
    })

    print(df.reset_index(drop=True))

    return df.reset_index(drop=True)


def get_full_groups(df, group_start_number):
    # Определяем группы, фиксируя переход от нулевого к ненулевому
    df['group'] = (df['currentpos'] != 0) & (df['currentpos'].shift().fillna(0) == 0)
    df['group'] = df['group'].cumsum()  # Увеличиваем номер группы
    # Нормализуем группы для всех значений, относящихся к одной группе
    df['group'] = df['group'].where(df['currentpos'] != 0).ffill()
    # Прибавляем start_number к каждой группе
    df['group'] += group_start_number

    # Определяем напрвление сделки 'long' и 'short' в зависимости от buysell
    def assign_position(group):
        first_value = group.iloc[0]  # Берем первое значение в группе
        if first_value == 'B':
            return 'long'
        elif first_value == 'S':
            return 'short'
        else:
            return None
    # Создаем новый столбец с результатом
    df['direction'] = df.groupby('group')['buysell'].transform(assign_position)

    # Создаем столбцы для подсчета покупок и продаж
    df['buy_quantity'] = df['quantity'].where(df['buysell'] == 'B', 0)
    df['sell_quantity'] = df['quantity'].where(df['buysell'] == 'S', 0)
    # Суммируем по группам
    df['total_buy_quantity'] = df.groupby('group')['buy_quantity'].transform('sum')
    df['total_sell_quantity'] = df.groupby('group')['sell_quantity'].transform('sum')
    # Отбираем группы, где total_buy_quantity не равно total_sell_quantity
    mismatched_quantity_df = df[df['total_buy_quantity'] != df['total_sell_quantity']].copy()
    mismatched_quantity_df['group'] = np.nan
    # Удаляем эти строки из основного DataFrame
    df = df[df['total_buy_quantity'] == df['total_sell_quantity']].copy()

    # Создаем новый столбец для покупки и продажи
    df['buy_value'] = df['value'].where(df['buysell'] == 'B', 0)
    df['sell_value'] = df['value'].where(df['buysell'] == 'S', 0)
    # Суммируем по группам
    df['comission_trade'] = df.groupby('group')['comission'].transform('sum')
    df['value_trade_buy'] = df.groupby('group')['buy_value'].transform('sum')
    df['value_trade_sell'] = df.groupby('group')['sell_value'].transform('sum')# Вычисляем разницу между максимальным и минимальным временем в днях для каждой группы
    df['time_in_trade'] = df.groupby('group')['time'].transform(lambda x: (x.max() - x.min()).total_seconds() / (24 * 3600))


    # Рассчитываем прибыль только если количества равны
    df['profit_trade'] = df['value_trade_sell'] - df['value_trade_buy'] - df['comission_trade']
    df['return_percent_trade'] = df['value_trade_sell'] / (df['value_trade_buy'] + df['comission_trade']) * 100 - 100

    # Рассчитываем общую прибыль и процент возврата
    ticker_buy_value = df['buy_value'].sum()
    ticker_sell_value = df['sell_value'].sum()
    ticker_comission = df['comission'].sum()
    # Суммируем time_in_trade по каждой группе и делим на кол-во групп
    # df['average_time_ticker'] = df.groupby('group')['time_in_trade'].first().sum() / df['group'].max()
    df['profit_ticker'] = ticker_sell_value - ticker_buy_value - ticker_comission
    df['return_percent_ticker'] = (ticker_sell_value / (ticker_buy_value + ticker_comission)) * 100 - 100 if ticker_buy_value != 0 else float('nan')

    df = pd.concat([df, mismatched_quantity_df])
    # Преобразуем столбец `time` в формат datetime, если это еще не сделано
    df = df.sort_values(by=['time', 'tradeno'], ascending=True).reset_index(drop=True)
    # print(df.loc[:20])
    return df.reset_index(drop=True)


def find_trades_by_unions():
    try:
        # Отправка GET-запроса к API
        response = requests.get(url)

        # Проверка статуса ответа
        if response.status_code == 200:
            # Обработка JSON-ответа
            trades = response.json()
            df = pd.json_normalize(trades)
            # print(df)

            # print(df[(df['ticker'] == 'TQBR/RNFT') & (df['union'] == '677477RFWBJ')])
            unions = df['union'].unique().tolist()
            tickers = df['ticker'].unique().tolist()
            df_all_unions = pd.DataFrame()
            # Задаем начальное значение для нумерации групп
            group_start_number = 0  # любое желаемое число

            for union in unions:
                df_union = pd.DataFrame()
                for ticker in tickers:
                    df_ticker = df[(df['ticker'] == ticker) & (df['union'] == union)]
                    df_ticker = delete_first_curpos_zero(df_ticker)
                    df_ticker = concat_parts_of_trades(df_ticker)
                    df_ticker = get_full_groups(df_ticker, group_start_number)
                    # Получаем последнее ненулевое и не NaN значение в столбце 'group'
                    if 'group' in df_ticker.columns and not df_ticker['group'].dropna().empty:
                        group_start_number = df_ticker['group'].dropna().iloc[-1]
                    df_union = pd.concat([df_union, df_ticker])
                df_union = df_union.sort_values(by=['time', 'tradeno'], ascending=True).reset_index(drop=True)

                # Рассчитываем общую прибыль и процент возврата
                union_buy_value = df_union['buy_value'].sum()
                union_sell_value = df_union['sell_value'].sum()
                union_comission = df_union['comission'].sum()
                # Суммируем time_in_trade по каждой группе и делим на кол-во групп
                # df_union['average_time_union'] = df_union.groupby('group')['time_in_trade'].first().sum() / df_union['group'].max()
                df_union.loc[df_union['buy_value'].notna(), 'profit_union'] = union_sell_value - union_buy_value - union_comission
                df_union.loc[df_union['buy_value'].notna(), 'return_percent_union'] = (union_sell_value / (
                            union_buy_value + union_comission)) * 100 - 100 if union_buy_value != 0 else float('nan')

                # trades_json = df.to_json(orient="records").replace(r"\/", "/")
                df_all_unions = pd.concat([df_all_unions, df_union])
            df_all_unions = df_all_unions.sort_values(by=['time', 'tradeno'], ascending=True).reset_index(drop=True)



            all_columns = df_all_unions.columns.tolist()
            # # Задаем столбцы, которые нужно удалить
            # columns_to_remove = ['column1', 'column2']  # замените на свои названия столбцов
            # # Создаем новый список, исключая ненужные столбцы
            # all_columns = [col for col in all_columns if col not in columns_to_remove]
            df_all_unions = df_all_unions[all_columns]


            # Преобразуем столбец с датами обратно в строку в формате "%Y-%m-%d %H:%M:%S"
            format_str = "%Y-%m-%d %H:%M:%S"
            df_all_unions['time'] = df_all_unions['time'].dt.strftime(format_str)
            trades_json = df_all_unions.to_json(orient="records").replace(r"\/", "/")

            # Преобразуем строку JSON обратно в список словарей
            trades_list = json.loads(trades_json)
            # Преобразуем список объектов модели в список словарей
            return trades_list

        else:
            print(f"Ошибка: {response.text}")

    except requests.exceptions.RequestException as e:
        print("Произошла ошибка при обращении к API:", e)


find_trades_by_unions()