import requests
import pandas as pd
import json
import numpy as np
from datetime import datetime, timedelta

# URL API-ресурса
baseURL = 'http://123/api'
# url = f'{baseURL}/trades/get_all'
# url = f'{baseURL}/trades/get_by_union_ticker'
# url = f'{baseURL}/trades/get_by_unions_and_times'
url = f'{baseURL}/trades/get_by_unions'
url_portfolio = f'{baseURL}/portfolio/get_by_datetime_range'

# Установить параметры отображения всех столбцов
pd.set_option('display.max_columns', None)  # Отображать все столбцы
pd.set_option('display.expand_frame_repr', False)  # Отключить перенос строк
start_time = '2024-03-22T11:41:17.000Z'
end_time = '2024-11-01T19:26:00.000Z'
params = {
    'unions': ['123'],
    # 'ticker': 'TQBR/SBER'
}

params_portfolio = {
    'unions': ['123'],
    # 'ticker': 'TQBR/SBER'
    'start_time': start_time,
    'end_time': end_time,
}

format_str = "%Y-%m-%dT%H:%M:%S.%fZ"
start_time_request = datetime.strptime(start_time, format_str) if start_time else None
end_time_request = datetime.strptime(end_time, format_str) if end_time else None


def add_open_trades(df, full_df):
    unions = df['union'].unique().tolist()
    tickers = df['ticker'].unique().tolist()

    new_df = pd.DataFrame(columns=df.columns)

    for union in unions:
        for ticker in tickers:
            df_ticker = df[(df['ticker'] == ticker) & (df['union'] == union)]
            # Если есть группы не nan
            if not df_ticker[pd.notna(df_ticker['group'])].empty:
                # Определяем значение first_group как значение 'group' из первой строки df_ticker
                first_group = df_ticker.iloc[0]['group']

                if pd.notna(first_group):
                    # Удаляем строки, где 'group' равен first_group
                    df_ticker = df_ticker[df_ticker['group'] != first_group]
                    # Добавляем строки из полного df, где 'group' равен first_group
                    new_rows_group = full_df[full_df['group'] == first_group]
                    df_ticker = pd.concat([df_ticker, new_rows_group], ignore_index=True)
                else:
                    # Находим индекс первой строки, где 'group' не является NaN
                    first_valid_index = df_ticker['group'].first_valid_index()
                    # Если такой индекс найден, отфильтровываем строки до него
                    if first_valid_index is not None:
                        df_ticker = df_ticker.loc[first_valid_index:]
            else:
                # Если все значения 'NaN', очищаем df_ticker
                df_ticker = df_ticker[0:0]

            # Исключаем пустые или полностью NaN столбцы из df_ticker перед конкатенацией
            # df_ticker = df_ticker.dropna(how='all', axis=1)
            # Конкатенируем new_df и df_ticker
            if not new_df.empty:
                new_df = pd.concat([new_df, df_ticker], ignore_index=True)
            else:
                new_df = df_ticker.copy()

    return new_df


def get_metrics_from_df_full_trades(df_trades):
    def add_metrics(df):
        def add_periods_groups(df):
            group_period = 1
            start_index = 0
            while start_index <= len(df) - 1:
                current_group = df.loc[start_index]['group']
                # Собрать все группы внутри нового дф , построить новый дф и взять оттуда конец
                end_index = df[df['group'] == current_group].index[-1]
                # Получаем уникальные значения из столбца 'group' в указанном диапазоне индексов
                groups = df.loc[start_index:end_index, 'group'].unique().tolist()

                while True:
                    # Фильтруем датафрейм, оставляя только строки, где значения 'group' находятся в списке `groups`
                    df_group = df[df['group'].isin(groups)]
                    if end_index == df_group.index[-1]:
                        # print(end_index, df_group.index[-1])
                        break
                    else:
                        end_index = df_group.index[-1]
                        # Получаем уникальные значения из столбца 'group' в указанном диапазоне индексов
                        groups = df.loc[start_index:end_index, 'group'].unique().tolist()
                        # end_index = new_end_index
                df.loc[start_index:end_index, 'group_period'] = group_period
                group_period += 1
                start_index = end_index + 1

            df['days_in_group_period'] = df.groupby('group_period')['time'].transform(lambda x: (x.max() - x.min()).total_seconds() / (24 * 3600))
            return df

        def add_cum_metrics(df):
            # Находим максимальное время для каждой группы
            group_max_time = df.groupby('group', observed=True)['time'].max()
            # Сортируем группы по максимальному времени в порядке убывания
            sorted_groups = group_max_time.sort_values(ascending=True).index.tolist()
            # Превращаем поле "group" в категориальный тип с заданным порядком
            df['group'] = pd.Categorical(df['group'], categories=sorted_groups, ordered=True)
            # Сортируем сначала по категории "group", а затем по "time" внутри каждой группы
            df = df.sort_values(['group', 'time'])

            current_sum_profit = 0
            current_sum_value_buy = 0
            current_sum_value_sell = 0
            current_sum_comission = 0
            current_max_profit_for_dd = 0
            current_date_for_dd = df.loc[0]['time']
            current_dd = 0
            current_dd_days = 0
            current_group = 0
            current_positive_series = 0
            current_negative_series = 0
            direction = ''
            for index, row in df.iterrows():
                if current_group != row['group']:
                    direction = 'long' if row['buysell'] == 'B' else 'short'
                    current_sum_profit += row['profit_trade']
                    current_sum_value_buy += row['value_trade_buy']
                    current_sum_value_sell += row['value_trade_sell']
                    current_sum_comission += row['comission_trade']
                    current_group = row['group']
                    end_date_group = df[df['group'] == current_group].iloc[-1]['time']
                    if current_sum_profit < current_max_profit_for_dd:
                        current_dd = current_sum_profit - current_max_profit_for_dd
                        current_dd_days += (end_date_group - current_date_for_dd).total_seconds() / (24 * 3600)  # Отнимаем послеюнюю дату в группе
                    else:
                        current_max_profit_for_dd = current_sum_profit
                        current_dd = 0
                        current_date_for_dd = end_date_group
                        current_dd_days = 0
                    if row['profit_trade'] > 0:
                        current_positive_series += 1
                        current_negative_series = 0
                    if row['profit_trade'] < 0:
                        current_positive_series = 0
                        current_negative_series += 1

                df.loc[index, 'direction'] = direction
                df.loc[index, 'cum_drawdawn'] = round(current_dd, 2)
                df.loc[index, 'cum_drawdawn_percent'] = round(current_dd / (current_sum_value_buy + current_sum_comission) * 100, 2) if (
                                                                                                                                                current_sum_value_buy + current_sum_comission) != 0 else 0
                df.loc[index, 'cum_drawdawn_days'] = round(current_dd_days, 2)
                df.loc[index, 'cum_profit'] = round(current_sum_profit, 2)
                df.loc[index, 'cum_return'] = round(current_sum_value_sell / (current_sum_value_buy + current_sum_comission) * 100 - 100, 2) if (
                                                                                                                                                        current_sum_value_buy + current_sum_comission) != 0 else 0
                df.loc[index, 'positive_series'] = current_positive_series
                df.loc[index, 'negative_series'] = current_negative_series
            return df

        # Отбираем группы, где total_buy_quantity не равно total_sell_quantity
        mismatched_quantity_df = df[df['total_buy_quantity'] != df['total_sell_quantity']].copy()
        mismatched_quantity_df = mismatched_quantity_df.dropna(axis=1, how='all')
        # print(mismatched_quantity_df)
        # Удаляем эти строки из основного DataFrame
        df = df[df['total_buy_quantity'] == df['total_sell_quantity']].copy().reset_index(drop=True)

        # Рассчитываем общую прибыль и процент возврата
        buy_value_total = df['buy_value'].sum()
        sell_value_total = df['sell_value'].sum()
        comission_total = df['comission'].sum()
        # Суммируем time_in_trade по каждой группе и делим на кол-во групп
        # df_union['average_time_union'] = df_union.groupby('group')['time_in_trade'].first().sum() / df_union['group'].max()
        df['return_percent_total'] = (sell_value_total / (buy_value_total + comission_total)) * 100 - 100 if buy_value_total != 0 else 0

        df = add_periods_groups(df)

        # print(df)
        profit_factor_metric = sell_value_total - buy_value_total - comission_total
        return_metric = (sell_value_total / (buy_value_total + comission_total)) * 100 - 100 if (buy_value_total + comission_total) != 0 else 0
        full_trades_count = df['group'].nunique()
        total_days = df.groupby('group_period')['days_in_group_period'].first().sum()

        profit_of_trades = df[df['profit_trade'] > 0].groupby('group', observed=True)['profit_trade'].first().sum()
        profit_trades_count = df[df['profit_trade'] > 0].groupby('group', observed=True)['profit_trade'].first().count()
        profit_trades_percent = profit_trades_count / full_trades_count * 100 if full_trades_count != 0 else 0
        average_profit_trade = profit_of_trades / profit_trades_count if profit_trades_count != 0 else 0

        lose_of_trades = df[df['profit_trade'] < 0].groupby('group', observed=True)['profit_trade'].first().sum()
        lose_trades_count = df[df['profit_trade'] < 0].groupby('group', observed=True)['profit_trade'].first().count()
        lose_trades_percent = lose_trades_count / full_trades_count * 100 if full_trades_count != 0 else 0
        average_lose_trade = lose_of_trades / lose_trades_count if lose_trades_count != 0 else 0

        ratio = abs(average_profit_trade / average_lose_trade) if average_lose_trade != 0 else 0
        largest_winning_trade = df[df['profit_trade'] > 0]['profit_trade'].max()
        largest_losing_trade = df[df['profit_trade'] < 0]['profit_trade'].min()

        df = add_cum_metrics(df)

        max_cum_drawdawn = df['cum_drawdawn'].min()
        max_cum_drawdawn_percent = df['cum_drawdawn_percent'].min()
        max_cum_drawdawn_days = df['cum_drawdawn_days'].max()
        recovery_factor = return_metric / max_cum_drawdawn_percent if max_cum_drawdawn_percent != 0 else 0
        annual_return = return_metric / total_days * 365 if total_days != 0 else 0
        annual_recovery_factor = annual_return / max_cum_drawdawn_percent if max_cum_drawdawn_percent != 0 else 0
        max_positive_series = df['positive_series'].max()
        max_negative_series = df['negative_series'].max()
        average_days_in_trade = df.groupby('group', observed=True)['time_in_trade'].first().sum() / int(full_trades_count) if pd.notna(full_trades_count) else 0

        # print(mismatched_quantity_df)

        metrics = {
            "return": round(return_metric, 2),  # Net Profit
            "profit_factor": round(profit_factor_metric, 2),  # Profit factor
            "max_cum_drawdawn": round(max_cum_drawdawn, 2),  # Max DrawDown (%)
            "max_cum_drawdawn_days": round(max_cum_drawdawn_days, 2),  # Max DrawDown (days)
            "cum_recovery_factor": round(recovery_factor, 2),  # Recovery Factor
            "cum_recovery_factor_annual": round(annual_recovery_factor, 2),  # Recovery Factor +
            "trades_count": int(full_trades_count) if pd.notna(full_trades_count) else 0,  # Total of Trades
            "profit_trades_percent": round(profit_trades_percent, 2),  # % Profitable
            "average_profit_trade": round(average_profit_trade),  # Average Winning Trade
            "average_lose_trade": round(average_lose_trade),  # Average Losing Trade
            "ratio": round(ratio, 2),  # Ratio Avg Win / Avg Loss
            "largest_winning_trade": int(largest_winning_trade) if pd.notna(largest_winning_trade) else 0,  # Largest Winning Trade
            "largest_losing_trade": int(largest_losing_trade) if pd.notna(largest_losing_trade) else 0,  # Largest Losing Trade
            "maximum_positive_series_of_trades": int(max_positive_series) if pd.notna(max_positive_series) else 0,  # Max Profitable Series
            "maximum_negative_series_of_trades": int(max_negative_series) if pd.notna(max_negative_series) else 0,  # Max Profitable Series
            "average_days_in_trade": round(average_days_in_trade, 2),  # Average Time in Trade
            "total_days_in_trade": round(total_days, 2),  # Total Days in Trades

            "annual_return": round(annual_return, 2),
            "max_cum_drawdawn_percent": round(max_cum_drawdawn_percent, 2),

        }
        df = pd.concat([df, mismatched_quantity_df])
        return [df, metrics]

    # if df_trades['time'].min() < start_time_request:
    #     start_time_equity_metric = start_time_request
    # else:
    #     start_time_equity_metric = df_trades['time'].min()
    # end_time_equity_metric = df_trades['time'].max()
    # days_in_period_equity_metric = (end_time_equity_metric - start_time_equity_metric).total_seconds() / (60 * 60 * 24)
    # print(df_trades)

    df_longs = df_trades[df_trades['direction'] == 'long']
    df_shorts = df_trades[df_trades['direction'] == 'short']

    [df_full_sorted, metrics_full] = add_metrics(df_trades)
    [df_longs_sorted, metrics_longs] = add_metrics(df_longs)
    [df_shorts_sorted, metrics_shorts] = add_metrics(df_shorts)

    # print(metrics_full)

    df_full_not_sorted = df_full_sorted.sort_values(by=['time', 'tradeno']).reset_index(drop=True)
    df_longs_not_sorted = df_longs_sorted.sort_values(by=['time', 'tradeno']).reset_index(drop=True)
    df_shorts_not_sorted = df_shorts_sorted.sort_values(by=['time', 'tradeno']).reset_index(drop=True)

    # Преобразуем все столбцы в строки
    # df_full_sorted = df_full_sorted.astype('string')
    # df_full_not_sorted = df_full_not_sorted.astype('string')
    # df_longs_sorted = df_longs_sorted.astype('string')
    # df_longs_not_sorted = df_longs_not_sorted.astype('string')
    # df_shorts_sorted = df_shorts_sorted.astype('string')
    # df_shorts_not_sorted = df_shorts_not_sorted.astype('string')

    def get_list_from_df(df):
        grouped_list = []
        cum_equity_list = []
        cum_equity_percent_list = []
        cum_drawdawns_list = []
        cum_drawdawns_percent_list = []

        # Группировка по колонке 'group'
        for group_name, group_data in df.groupby('group', observed=True):
            # group_data['time'] = group_data.astype('string')
            group_data['time'] = group_data['time'].astype('string')
            # print(group_data)
            # Преобразуем каждую группу в JSON формат
            group_json = group_data.to_json(orient="records", force_ascii=False).replace(r"\/", "/")
            # Загружаем JSON-строку как список словарей и добавляем в итоговый список
            grouped_list.append(json.loads(group_json))

            # Добавляем первые значения колонок equity и drawdown в соответствующие списки
            cum_equity_list.append({
                'equity': group_data['cum_profit'].iloc[-1],
                'time': group_data['time'].iloc[-1],
            })
            cum_equity_percent_list.append({
                'equity': group_data['cum_return'].iloc[-1],
                'time': group_data['time'].iloc[-1],
            })
            cum_drawdawns_list.append({
                'drawdawn': group_data['cum_drawdawn'].iloc[-1],
                'time': group_data['time'].iloc[-1],
            })
            cum_drawdawns_percent_list.append({
                'drawdawn': group_data['cum_drawdawn_percent'].iloc[-1],
                'time': group_data['time'].iloc[-1],
            })

        return [grouped_list, cum_equity_list, cum_equity_percent_list, cum_drawdawns_list, cum_drawdawns_percent_list]

    # Создаем пустой список для хранения групп
    [trades_full_list, equity_full_list, equity_full_percent_list, drawdawns_full_list, drawdawns_full_percent_list] = get_list_from_df(df_full_sorted)
    [trades_longs_list, equity_longs_list, equity_longs_percent_list, drawdawns_longs_list, drawdawns_longs_percent_list] = get_list_from_df(df_longs_sorted)
    [trades_shorts_list, equity_shorts_list, equity_shorts_percent_list, drawdawns_shorts_list, drawdawns_shorts_percent_list] = get_list_from_df(df_shorts_sorted)

    # print(df_full_sorted[:20])

    return {
        'metrics_full': metrics_full,
        'metrics_longs': metrics_longs,
        'metrics_shorts': metrics_shorts,
        'trades_full_list': trades_full_list,
        'trades_longs_list': trades_longs_list,
        'trades_shorts_list': trades_shorts_list,
        'equity_full_list': equity_full_list,
        'equity_full_percent_list': equity_full_percent_list,
        'drawdawns_full_list': drawdawns_full_list,
        'drawdawns_full_percent_list': drawdawns_full_percent_list,
    }

    # trades_full_sorted_json = df_full_sorted.to_json(orient="records").replace(r"\/", "/")
    # trades_full_not_sorted_json = df_full_not_sorted.to_json(orient="records").replace(r"\/", "/")
    # trades_longs_sorted_json = df_longs_sorted.to_json(orient="records").replace(r"\/", "/")
    # trades_shorts_sorted_json = df_shorts_sorted.to_json(orient="records").replace(r"\/", "/")
    #
    # # Преобразуем строку JSON обратно в список словарей
    # trades_full_sorted_list = json.loads(trades_full_sorted_json)
    # trades_full_not_sorted_list = json.loads(trades_full_not_sorted_json)
    # trades_longs_sorted_list = json.loads(trades_longs_sorted_json)
    # trades_shorts_sorted_list = json.loads(trades_shorts_sorted_json)

    #  Каждую полную сделку в список и все в список

    # print(df_full_not_sorted.loc[:])
    # print(metrics_full)
    #
    # print(df_longs_not_sorted.loc[:])
    # print(metrics_longs)
    #
    # print(df_shorts_not_sorted.loc[:])
    # print(metrics_shorts)


def get_portfolio_metrics(df):
    def get_lists_eq_dd(df_portfolio):
        df = df_portfolio.copy()

        df['time'] = df['time'].astype('string')
        # Создаем список словарей с объектами 'equity' и 'time'
        equity_list = [{'equity': round(eq, 2), 'time': time} for eq, time in zip(df['equity'], df['time'])]
        equity_percent_list = [{'equity': round(eq, 2), 'time': time} for eq, time in zip(df['eq_percent'], df['time'])]
        drawdawns_list = [{'drawdawn': round(eq, 2), 'time': time} for eq, time in zip(df['drawdown_currency'], df['time'])]
        drawdawns_percent_list = [{'drawdawn': round(eq, 2), 'time': time} for eq, time in zip(df['drawdown_percent'], df['time'])]

        return [equity_list, equity_percent_list, drawdawns_list, drawdawns_percent_list]

    df['time'] = pd.to_datetime(df['time'])
    # print(portfolio_json, unions, start_time_equity_metric, end_time_equity_metric)
    capital_start = df.iloc[0]['equity']
    capital_end = df.iloc[-1]['equity']
    capital_in_work_end = df.iloc[-1]['equity'] - df.iloc[-1]['balance']
    days_in_period = (df['time'].max() - df['time'].min()).total_seconds() / (24 * 3600)

    # Начальное значение equity для расчёта относительного прироста
    initial_equity = df['equity'].iloc[0]
    # # Equity в %
    # df['equity'] = df['equity'] / initial_equity
    # # Кумулятивный прирост в валюте
    # df['cum_eq'] = df['equity'] - initial_equity
    # Кумулятивный прирост в процентах
    df['eq_percent'] = (df['equity'] / initial_equity - 1) * 100 + 100

    # Находим максимальное значение equity на каждом шаге (для расчёта просадок)
    df['max_equity'] = df['equity'].cummax()
    # Рассчитываем просадку в валюте
    df['drawdown_currency'] = df['equity'] - df['max_equity']
    # Рассчитываем просадку в процентах
    df['drawdown_percent'] = (df['equity'] - df['max_equity']) / df['max_equity'] * 100

    # Рассчитаем разницу времени между текущей и предыдущей строкой
    df['days_between'] = (df['time'].diff().dt.total_seconds() / (24 * 3600)).fillna(0).where(df['drawdown_percent'] != 0, 0)

    # Определяем группы, фиксируя переход от отрицательного к нулевому и где не подряд 0
    df['group'] = (df['drawdown_currency'] < 0) & (df['drawdown_currency'].shift().fillna(0) == 0)
    df['group2'] = (df['drawdown_currency'] != 0) | (df['drawdown_currency'].shift().fillna(0) != 0)
    df['group'] = df['group'].cumsum().where(df['group2'], 0)  # Увеличиваем номер группы

    # Группируем по 'group' и считаем кумулятивную сумму по 'days_between'
    df['cum_days_dd'] = df.groupby('group')['days_between'].cumsum()

    print('Return_percent_portfolio')
    return_percent_portfolio = (capital_end / capital_start - 1) * 100 if capital_start != 0 else 0  # начальный эквити
    print('Return_percent_annual_portfolio')
    return_percent_annual_portfolio = ((return_percent_portfolio / 100 + 1) ** (365 / days_in_period) - 1) * 100 if days_in_period != 0 else 0
    max_drawdown_portfolio = df['drawdown_currency'].min()
    max_drawdown_percent_portfolio = df['drawdown_percent'].min()
    max_drawdawn_days = df['cum_days_dd'].max()

    if max_drawdown_portfolio != 0:
        recovery_factor_metric = return_percent_portfolio / (max_drawdown_portfolio * 100)
        recovery_factor_annual_metric = return_percent_annual_portfolio / (max_drawdown_portfolio * 100)
    else:
        recovery_factor_metric = 0
        recovery_factor_annual_metric = 0

    # Процент задействованного капитала
    print('percentage_of_capital_at_work')
    percentage_of_capital_at_work = capital_in_work_end / capital_start * 100 if capital_start != 0 else 0

    [equity_list, equity_percent_list, drawdawns_list, drawdawns_percent_list] = get_lists_eq_dd(df)

    # print(df[:20])
    portfolio_metrics = {
        'return_percent_portfolio': round(return_percent_portfolio, 2),
        'return_percent_annual_portfolio': round(return_percent_annual_portfolio, 2),
        'max_drawdown_portfolio': round(max_drawdown_portfolio, 2),
        'max_drawdown_percent_portfolio': round(max_drawdown_percent_portfolio, 2),
        'max_drawdawn_days': round(max_drawdawn_days, 2),
        'recovery_factor_metric': round(recovery_factor_metric, 2),
        'recovery_factor_annual_metric': round(recovery_factor_annual_metric, 2),
        'percentage_of_capital_at_work': round(percentage_of_capital_at_work, 2),

        'equity_list': equity_list,
        'equity_percent_list': equity_percent_list,
        'drawdawns_list': drawdawns_list,
        'drawdawns_percent_list': drawdawns_percent_list,
    }

    return portfolio_metrics


try:
    # Отправка GET-запроса к API
    response = requests.post(url, json=params)
    if response.status_code != 200:
        print(response.status_code, response.text)

    # Проверка статуса ответа
    if response.status_code == 200:
        # Обработка JSON-ответа
        all_trades_json = response.json()

        df_all_trades = pd.json_normalize(all_trades_json)

        # Замена None на NaN
        # df_all_trades = df_all_trades.where(pd.notnull(df_all_trades), np.nan)

        df_all_trades['time'] = pd.to_datetime(df_all_trades['time'])
        df_trades = df_all_trades.copy()

        if start_time_request and end_time_request:
            df_trades = df_trades.loc[(df_trades['time'] >= start_time_request) & (df_trades['time'] <= end_time_request)]
        elif start_time_request:
            df_trades = df_trades.loc[df_trades['time'] >= start_time_request]
        elif end_time_request:
            df_trades = df_trades.loc[df_trades['time'] <= end_time_request]

        # Получаем тикеры, по которым надо добавить сделки открытия
        print('add_open_trades')
        df_trades = add_open_trades(df_trades, df_all_trades)

        if not df_trades.empty:
            all_data = get_metrics_from_df_full_trades(df_trades)
            metrics_full = all_data['metrics_full']
            metrics_longs = all_data['metrics_longs']
            metrics_shorts = all_data['metrics_shorts']
            trades_full_list = all_data['trades_full_list']
            trades_longs_list = all_data['trades_longs_list']
            trades_shorts_list = all_data['trades_shorts_list']
            equity_full_list = all_data['equity_full_list']
            equity_full_percent_list = all_data['equity_full_percent_list']
            drawdawns_full_list = all_data['drawdawns_full_list']
            drawdawns_full_percent_list = all_data['drawdawns_full_percent_list']

        try:
            # Отправка GET-запроса к API
            response_portfolio = requests.post(url_portfolio, json=params_portfolio)
            if response_portfolio.status_code != 200:
                print(response_portfolio.status_code, response_portfolio.text)

            # Проверка статуса ответа
            if response_portfolio.status_code == 200:
                # Обработка JSON-ответа
                portfolio_json = response_portfolio.json()

                df_portfolio = pd.json_normalize(portfolio_json)

                portfolio_metrics = get_portfolio_metrics(df_portfolio)

                print(portfolio_metrics)

            else:
                print(f"Ошибка Portfolio: {response_portfolio.text}")
        except requests.exceptions.RequestException as e:
            print("Произошла ошибка при обращении к API Portfolio:", e)


    else:
        print(f"Ошибка: {response.text}")
except requests.exceptions.RequestException as e:
    print("Произошла ошибка при обращении к API:", e)
