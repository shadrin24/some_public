import pandas as pd
from db import db
from datetime import datetime
from sqlalchemy import distinct, and_, desc
from sqlalchemy.sql import func, case
import numpy as np
import json

# v2
class TradeModel(db.Model):
    __tablename__ = "trades"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    type = db.Column(db.String(10), nullable=False)
    orderno = db.Column(db.String(20), primary_key=True)
    secid = db.Column(db.String(10), nullable=False)
    union = db.Column(db.String(20), nullable=False)
    ticker = db.Column(db.String(20), nullable=False)
    client = db.Column(db.String(20), nullable=False)
    buysell = db.Column(db.String(1), nullable=False)
    value = db.Column(db.Float, nullable=False)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    status = db.Column(db.String(20), nullable=True)
    currentpos = db.Column(db.Integer, nullable=False)
    comission = db.Column(db.Float, nullable=False)
    tradeno = db.Column(db.String(255), primary_key=True)

    @classmethod
    def find_by_id(cls, id: int):
        return cls.query.filter_by(id=id).first()

    @classmethod
    def find_after_id(cls, id: int):
        print(id)
        trades = cls.query.filter(cls.id > id).all()
        print(trades)
        return [trade.to_json() for trade in trades]



    @classmethod
    def find_by_ticker(cls, ticker: str) -> ["TradeModel"]:
        trades = cls.query.filter_by(ticker=ticker) \
            .group_by(
            cls.type, cls.orderno, cls.union, cls.ticker, cls.client, cls.buysell,
            cls.value, cls.price, cls.quantity, cls.time, cls.status,
            cls.comission, cls.tradeno
        ).with_entities(
            func.min(cls.id).label('id'), func.min(cls.secid).label('secid'), cls.type, cls.orderno, cls.union, cls.ticker, cls.client, cls.buysell,
            cls.value, cls.price, cls.quantity, cls.time, cls.status,
            (func.max(func.abs(cls.currentpos)) * func.sign(func.sum(cls.currentpos))).label('currentpos'),
            cls.comission, cls.tradeno
        )

        # Сортируем результаты по времени (от раннего к позднему)
        trades = trades.order_by(cls.time).all()
        # Преобразуем результаты в объекты модели TradeModel
        trade_objects = [cls(**trade._asdict()) for trade in trades]
        return trade_objects

    @classmethod
    def find_by_orderno(cls, orderno: str) -> ["TradeModel"]:
        # Сортируем результаты по времени (от раннего к позднему)
        trades = cls.query.filter_by(orderno=orderno) \
            .group_by(
            cls.type, cls.orderno, cls.union, cls.ticker, cls.client, cls.buysell,
            cls.value, cls.price, cls.quantity, cls.time, cls.status,
            cls.comission, cls.tradeno
        ).with_entities(
            func.min(cls.id).label('id'), func.min(cls.secid).label('secid'), cls.type, cls.orderno, cls.union, cls.ticker, cls.client, cls.buysell,
            cls.value, cls.price, cls.quantity, cls.time, cls.status,
            (func.max(func.abs(cls.currentpos)) * func.sign(func.sum(cls.currentpos))).label('currentpos'),
            cls.comission, cls.tradeno
        )

        # Сортируем результаты по времени (от раннего к позднему)
        trades = trades.order_by(cls.time).all()
        # Преобразуем результаты в объекты модели TradeModel
        trade_objects = [cls(**trade._asdict()) for trade in trades]
        return trade_objects

    @classmethod
    def find_all(cls) -> list[dict]:
        trades = cls.query.order_by(cls.time) \
            .group_by(
            cls.type, cls.orderno, cls.union, cls.ticker, cls.client, cls.buysell,
            cls.value, cls.price, cls.quantity, cls.time, cls.status,
            cls.comission, cls.tradeno
        ).with_entities(
            func.min(cls.id).label('id'), func.min(cls.secid).label('secid'), cls.type, cls.orderno, cls.union, cls.ticker, cls.client, cls.buysell,
            cls.value, cls.price, cls.quantity, cls.time, cls.status,
            (func.max(func.abs(cls.currentpos)) * func.sign(func.sum(cls.currentpos))).label('currentpos'),
            cls.comission, cls.tradeno
        )

        # Сортируем результаты по времени (от раннего к позднему)
        trades = trades.all()
        # Преобразуем результаты в объекты модели TradeModel
        trade_objects = [cls(**trade._asdict()) for trade in trades]
        return [trade.to_json() for trade in trade_objects]

    @classmethod
    def find_all_trades(cls) -> list[dict]:
        trades = cls.query.filter_by(type='trade') \
            .group_by(
            cls.type, cls.orderno, cls.union, cls.ticker, cls.client, cls.buysell,
            cls.value, cls.price, cls.quantity, cls.time, cls.status,
            cls.comission, cls.tradeno
        ).with_entities(
            func.min(cls.id).label('id'), func.min(cls.secid).label('secid'), cls.type, cls.orderno, cls.union, cls.ticker, cls.client, cls.buysell,
            cls.value, cls.price, cls.quantity, cls.time, cls.status,
            (func.max(func.abs(cls.currentpos)) * func.sign(func.sum(cls.currentpos))).label('currentpos'),
            cls.comission, cls.tradeno
        )

        # Сортируем результаты по времени (от раннего к позднему)
        trades = trades.order_by(cls.time).all()
        # Преобразуем результаты в объекты модели TradeModel
        trade_objects = [cls(**trade._asdict()) for trade in trades]
        return [trade.to_json() for trade in trade_objects]

    @classmethod
    def exists(cls, tradeno: str, secid: str, union: str) -> bool:
        return cls.query.filter_by(tradeno=tradeno, secid=secid, union=union).first() is not None

    @classmethod
    def find_by_ticker_union(cls, ticker: str, union: str) -> list[dict]:
        trades = cls.query.filter_by(ticker=ticker, union=union) \
            .group_by(
            cls.type, cls.orderno, cls.union, cls.ticker, cls.client, cls.buysell,
            cls.value, cls.price, cls.quantity, cls.time, cls.status,
            cls.comission, cls.tradeno
        ).with_entities(
            func.min(cls.id).label('id'), func.min(cls.secid).label('secid'), cls.type, cls.orderno, cls.union, cls.ticker, cls.client, cls.buysell,
            cls.value, cls.price, cls.quantity, cls.time, cls.status,
            (func.max(func.abs(cls.currentpos)) * func.sign(func.sum(cls.currentpos))).label('currentpos'),
            cls.comission, cls.tradeno
        )

        # Сортируем результаты по времени (от раннего к позднему)
        trades = trades.order_by(cls.time).all()
        # Преобразуем результаты в объекты модели TradeModel
        trade_objects = [cls(**trade._asdict()) for trade in trades]
        return [trade.to_json() for trade in trade_objects]

    # Поиск сделок по счету и тикеру
    @classmethod
    def find_trades_by_union_ticker(cls, union: str, ticker: str) -> list[dict]:
        trades = cls.query.filter_by(type='trade', union=union, ticker=ticker) \
            .group_by(
            cls.type, cls.orderno, cls.union, cls.ticker, cls.client, cls.buysell,
            cls.value, cls.price, cls.quantity, cls.time, cls.status,
            cls.comission, cls.tradeno
        ).with_entities(
            func.min(cls.id).label('id'), func.min(cls.secid).label('secid'), cls.type, cls.orderno, cls.union, cls.ticker, cls.client, cls.buysell,
            cls.value, cls.price, cls.quantity, cls.time, cls.status,
            (func.max(func.abs(cls.currentpos)) * func.sign(func.sum(cls.currentpos))).label('currentpos'),
            cls.comission, cls.tradeno
        )

        # Сортируем результаты по времени (от раннего к позднему)
        trades = trades.order_by(cls.time).all()
        # Преобразуем результаты в объекты модели TradeModel
        trade_objects = [cls(**trade._asdict()) for trade in trades]
        # print(trades)
        trades = [trade.to_json() for trade in trade_objects]

        df = pd.json_normalize(trades)
        df = delete_first_curpos_zero(df)
        df = concat_parts_of_trades(df)
        df = get_full_groups(df, 0)
        # Преобразуем столбец с датами обратно в строку в формате "%Y-%m-%d %H:%M:%S"
        format_str = "%Y-%m-%d %H:%M:%S"
        df['time'] = df['time'].dt.strftime(format_str)
        trades_json = df.to_json(orient="records").replace(r"\/", "/")
        # Преобразуем строку JSON обратно в список словарей
        trades_list = json.loads(trades_json)
        # Преобразуем список объектов модели в список словарей
        return trades_list

    # Поиск сделок по списку счетов и диапазону времени
    @classmethod
    def find_trades_by_unions_and_time_range(cls, unions: list[str], start_time: datetime = None,
                                             end_time: datetime = None) -> list[dict]:
        # Оставляем только сделки и фильтруем записи по списку unions и диапазону времени
        trades = cls.query.filter(cls.type == 'trade', cls.union.in_(unions)) \
            .group_by(
            cls.type, cls.orderno, cls.union, cls.ticker, cls.client, cls.buysell,
            cls.value, cls.price, cls.quantity, cls.time, cls.status,
            cls.comission, cls.tradeno
        ).with_entities(
            func.min(cls.id).label('id'), func.min(cls.secid).label('secid'), cls.type, cls.orderno, cls.union, cls.ticker, cls.client, cls.buysell,
            cls.value, cls.price, cls.quantity, cls.time, cls.status,
            (func.max(func.abs(cls.currentpos)) * func.sign(func.sum(cls.currentpos))).label('currentpos'),
            cls.comission, cls.tradeno
        )

        if start_time is not None:
            trades = trades.filter(cls.time >= start_time)
        if end_time is not None:
            trades = trades.filter(cls.time <= end_time)

        # Сортируем результаты по времени (от раннего к позднему)
        trades = trades.order_by(cls.time).all()
        # Преобразуем результаты в объекты модели TradeModel
        trade_objects = [cls(**trade._asdict()) for trade in trades]
        # Преобразуем список объектов модели в список словарей
        return [trade.to_json() for trade in trade_objects]

        # Поиск сделок по списку счетов и диапазону времени

    @classmethod
    def find_trades_by_unions(cls, unions: list[str]) -> list[dict]:
        # Оставляем только сделки и фильтруем записи по списку unions и диапазону времени
        print('find_trades_by_unions')
        trades = cls.query.filter(cls.type == 'trade', cls.union.in_(unions)) \
            .group_by(
            cls.type, cls.orderno, cls.union, cls.ticker, cls.client, cls.buysell,
            cls.value, cls.price, cls.quantity, cls.time, cls.status,
            cls.comission, cls.tradeno
        ).with_entities(
            func.min(cls.id).label('id'), func.min(cls.secid).label('secid'), cls.type, cls.orderno, cls.union, cls.ticker, cls.client, cls.buysell,
            cls.value, cls.price, cls.quantity, cls.time, cls.status,
            (func.max(func.abs(cls.currentpos)) * func.sign(func.sum(cls.currentpos))).label('currentpos'),
            cls.comission, cls.tradeno
        )

        # Сортируем результаты по времени (от раннего к позднему)
        trades = trades.order_by(cls.time).all()
        # Преобразуем результаты в объекты модели TradeModel
        trade_objects = [cls(**trade._asdict()) for trade in trades]
        # print(trades)
        trades = [trade.to_json() for trade in trade_objects]
        # Преобразуем результаты в DataFrame
        df = pd.json_normalize(trades)
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

    # Список счетов, по которым были сделки
    @classmethod
    def get_unique_trades_unions(cls) -> list[str]:
        # Выбираем уникальные значения c type: 'trade' из столбца union
        unique_unions = cls.query.with_entities(cls.union).filter(cls.type == 'trade').distinct().all()
        list_unions = [union[0] for union in unique_unions]
        return list_unions

    # Список тикеров на счете, по которым были сделки
    @classmethod
    def get_trades_tickers_by_union(cls, union: str) -> list[str]:
        # Выбираем тикеры по счету
        ticker_values_obj = cls.query.with_entities(cls.ticker).filter_by(type='trade', union=union).distinct().all()
        list_tickers = [ticker_value.ticker for ticker_value in ticker_values_obj]
        return list_tickers

    # Метод для получения тикеров и количества записей по каждому тикеру
    @classmethod
    def get_trades_tickers_with_counts(cls, union: str) -> dict[str, int]:
        # Выбираем тикеры и количество записей по каждому тикеру
        ticker_counts = (
            cls.query
            .with_entities(cls.ticker, func.count(cls.ticker))
            .filter_by(type='trade', union=union)
            .group_by(cls.ticker)
            .all()
        )
        # Преобразуем результат в словарь {ticker: count}
        return {ticker: count for ticker, count in ticker_counts}

    def save_to_db(self) -> None:
        db.session.add(self)
        db.session.commit()

    def delete_from_db(self) -> None:
        db.session.delete(self)
        db.session.commit()

    def update_db(self) -> None:
        db.session.commit()

    @classmethod
    def update_by_id(cls, id: int, **kwargs) -> None:
        record = cls.find_by_id(id)
        if record:
            for key, value in kwargs.items():
                setattr(record, key, value)
            db.session.commit()
        else:
            raise ValueError("Record not found.")

    @classmethod
    def delete_by_id(cls, id: int) -> None:
        record = cls.find_by_id(id)
        if record:
            cls.query.filter(cls.id == id).delete()
            db.session.commit()
        else:
            raise ValueError("Record not found.")

    @classmethod
    def delete_before_date(cls, union: str, date):
        cls.query.filter(cls.time < date, cls.union == union).delete()
        db.session.commit()

    @classmethod
    def insert_many(cls, data_list):
        # Используем bulk insert для массовой вставки данных
        trades = [cls(**data) for data in data_list]
        db.session.bulk_save_objects(trades)
        db.session.commit()

    def to_json(self) -> dict:
        return {
            'id': self.id,
            'type': self.type,
            'orderno': self.orderno,
            'secid': self.secid,
            'union': self.union,
            'ticker': self.ticker,
            'client': self.client,
            'buysell': self.buysell,
            'value': self.value,
            'price': self.price,
            'quantity': self.quantity,
            'time': self.time.strftime("%Y-%m-%d %H:%M:%S"),
            'status': self.status,
            'currentpos': self.currentpos,
            'comission': self.comission,
            'tradeno': self.tradeno,
        }


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
    return df.reset_index(drop=True)
