import pandas as pd
import json
from flask_restful import Resource
from flask import request
from flask_jwt_extended import (
    get_jwt_identity,
    jwt_required,
)

from models.user import UserModel
from models.portfolio import PortfolioModel
from models.trades import TradeModel
from schemas.trade import TradeSchema
from datetime import datetime, timedelta
import xmltodict
from Metrics.metrics_from_df_full_trades import get_metrics_from_df_full_trades, get_portfolio_metrics

# v3

trade_schema = TradeSchema()


# Получение всех сделок и заявок
class GetAllTradesOrders(Resource):
    @classmethod
    # @jwt_required
    def get(cls):
        dataset = TradeModel.find_all()
        return dataset, 200


# Получение всех сделок
class GetAllTrades(Resource):
    @classmethod
    # @jwt_required
    def get(cls):
        dataset = TradeModel.find_all_trades()
        return dataset, 200


# Получение сделок по тикеру и счету
class GetTradesByUnionTicker(Resource):
    @classmethod
    def post(cls):
        try:
            trades_json = request.get_json()
            ticker = trades_json["ticker"]
            union = trades_json["union"]
            trades = TradeModel.find_trades_by_union_ticker(union=union, ticker=ticker)
            # print(trades)
            return trades, 200
        except Exception as e:
            return {"error": str(e)}, 500


# Получение сделок по тикеру и счету
class GetTradesByUnions(Resource):
    @classmethod
    def post(cls):
        try:
            trades_json = request.get_json()
            unions = trades_json["unions"]
            trades = TradeModel.find_trades_by_unions(unions=unions)
            # print(trades)
            return trades, 200
        except Exception as e:
            return {"error": str(e)}, 500


class TradeAddToBd(Resource):
    @classmethod
    def post(cls):
        xml_data = request.data.decode("utf-8")
        status = xml_to_json_and_write(xml_data)
        print(status)
        if status["status"] == 200:
            return [status["message"]], 200
        else:
            return [status["error"]], 500


# Получение списка счетов, по которым были сделки
class GetTradesUnions(Resource):
    @classmethod
    # @jwt_required
    def get(cls):
        list_unions = TradeModel.get_unique_trades_unions()
        # print(list_unions)
        return list_unions, 200


# Получение сделок по счету и диапазону дат
class GetTradesByUnionsAndTimeRange(Resource):
    @classmethod
    # @jwt_required
    def post(cls):
        try:
            params_json = request.get_json()
            unions = params_json["unions"]
            start_time = params_json["start_time"] if 'start_time' in params_json else None
            end_time = params_json["end_time"] if 'end_time' in params_json else None
            trades = TradeModel.find_trades_by_unions_and_time_range(unions, start_time, end_time)

            return trades, 200
        except Exception as e:
            return {"error": str(e)}, 500


# Получение сделок и метрик по счету и диапазону дат
class GetTradesAndMetricsByUnionsAndTimeRange(Resource):
    @classmethod
    # @jwt_required
    def post(cls):
        try:
            format_str = "%Y-%m-%dT%H:%M:%S.%fZ"
            params_json = request.get_json()
            unions = params_json["unions"]
            start_time_request = datetime.strptime(params_json["start_time"], format_str) if 'start_time' in params_json else None
            end_time_request = datetime.strptime(params_json["end_time"], format_str) if 'end_time' in params_json else None

            # Получаем сделки по списку счетов и диапазону дат
            all_trades_json = TradeModel.find_trades_by_unions(unions)
            all_trades = [unions, params_json["start_time"], params_json["end_time"], all_trades_json, TradeModel.find_all_trades()]

            # Создаем DataFrame из списка словарей
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

                metrics_full['trades_full'] = trades_full_list
                metrics_longs['trades_longs'] = trades_longs_list
                metrics_shorts['trades_shorts'] = trades_shorts_list

                metrics_full['all_trades'] = all_trades
                metrics_full['cum_equity_list'] = equity_full_list
                metrics_full['cum_equity_percent_list'] = equity_full_percent_list
                metrics_full['cum_drawdawn_list'] = drawdawns_full_list
                metrics_full['cum_drawdawn_percent_list'] = drawdawns_full_percent_list

                # Работа с Portfolio
                start_time_equity_metric = start_time_request
                end_time_equity_metric = end_time_request
                if not df_trades.empty:
                    if df_trades['time'].min() < start_time_request:
                        start_time_equity_metric = start_time_request
                    else:
                        start_time_equity_metric = df_trades['time'].min()
                    end_time_equity_metric = df_trades['time'].max()

                portfolio_json = PortfolioModel.find_by_datetime_range(unions, start_time_equity_metric, end_time_equity_metric)
                df_portfolio = pd.json_normalize(portfolio_json)

                portfolio_metrics = get_portfolio_metrics(df_portfolio)

                return {
                           'metrics_full': metrics_full,
                           'metrics_long': metrics_longs,
                           'metrics_short': metrics_shorts,
                           'portfolio_metrics': portfolio_metrics
                       }, 200
            else:
                return {
                           'metrics': [],
                           'metrics_long': [],
                           'metrics_short': [],
                           'portfolio_metrics': []
                       }, 200
        except Exception as e:
            return {"error": str(e)}, 500


# Получение списка тикеров, по которым были сделки
class GetTradesTickersByUnion(Resource):
    @classmethod
    def post(cls):
        try:
            params_json = request.get_json()
            union = params_json["union"]
            tickers = TradeModel.get_trades_tickers_by_union(union)
            return tickers
        except Exception as e:
            return {"error": str(e)}, 500


# Получение списка тикеров, по которым были сделки
class GetTradesTickersWithCounts(Resource):
    @classmethod
    def post(cls):
        try:
            params_json = request.get_json()
            union = params_json["union"]
            tickers = TradeModel.get_trades_tickers_with_counts(union)
            return tickers
        except Exception as e:
            return {"error": str(e)}, 500


def xml_to_json_and_write(xml):
    try:
        dict_data = xmltodict.parse(xml)
        type_order = list(dict_data.keys())[0]
        dict_data = dict_data[type_order]
        type_of_procedure = list(dict_data.keys())[0]
        if not isinstance(dict_data[type_of_procedure], list):
            orders = [dict_data[type_of_procedure]]
        else:
            orders = dict_data[type_of_procedure]
        for order in orders:
            # print(order)
            if not type_of_procedure == "stoporder":
                pp_data_order = {
                    "type": type_of_procedure,
                    "orderno": order["orderno"],
                    "secid": order["secid"],
                    "union": order["union"],
                    "ticker": f'{order["board"]}/{order["seccode"]}',
                    "client": order["client"],
                    "buysell": order["buysell"],
                    "value": order["value"],
                    "price": order["price"],
                    "quantity": order["quantity"],
                    "time": order["time"],
                    "status": order["status"] if "status" in order else None,
                    "currentpos": order["currentpos"] if "currentpos" in order else None,
                    "comission": order["comission"] if "comission" in order else None,
                    "tradeno": order["tradeno"],
                }
                trade_schema = TradeSchema()
                time_format = "%d.%m.%Y %H:%M:%S"

                pp_data_order['time'] = str(datetime.strptime(pp_data_order['time'], time_format))

                if TradeModel.exists(pp_data_order['tradeno'], pp_data_order['secid'], pp_data_order['union']):
                    print("Запись существует")
                else:
                    new_trade = trade_schema.load(pp_data_order)
                    new_trade.save_to_db()
                    print("Запись добавлена в БД")
        print({"message": "Все записи успешно добавлены в БД"})
        return {"status": 200, "message": "Все записи успешно добавлены в БД"}
    except Exception as e:
        print({"error": e})
        return {"status": 500, "error": e}


class UpdateTradeByID(Resource):
    @classmethod
    @jwt_required
    def put(cls, id: int):
        update_data = request.get_json()
        user_id = get_jwt_identity()
        current_user = UserModel.find_by_role(user_id)
        if current_user.role in ["admin", "technician"] or current_user.email == "123":
            try:
                TradeModel.update_by_id(id, **update_data)
                return f"Deal with id {id} updated successfully", 200
            except ValueError as e:
                return str(e), 404
        else:
            return "No access", 400


class DeleteTradeByID(Resource):
    @classmethod
    @jwt_required
    def put(cls, id: int):
        user_id = get_jwt_identity()
        current_user = UserModel.find_by_role(user_id)
        if current_user.role in ["admin", "technician"] or current_user.email == "123":
            try:
                TradeModel.delete_by_id(id)
                return f"Deal with id {id} deleted successfully", 200
            except ValueError as e:
                return str(e), 404
        else:
            return "No access", 400


class DeleteTradesBeforeDate(Resource):
    @classmethod
    @jwt_required
    def delete(cls):
        # Получаем данные из JSON запроса
        params_json = request.get_json()
        print("params_json: ", params_json)
        # Получаем дату из запроса
        date = params_json["date"]
        delete_date = datetime.strptime(date, "%Y-%m-%d")
        union = params_json["union"]
        user_id = get_jwt_identity()
        current_user = UserModel.find_by_role(user_id)
        if current_user.role in ["admin", "technician"]:
            try:
                # Вызываем метод модели для удаления записей до указанной даты
                TradeModel.delete_before_date(union, delete_date)
                return f"All trades before {delete_date} have been deleted successfully.", 200
            except ValueError as e:
                return f"Invalid date format: {e}", 400
            except Exception as e:
                return f"An error occurred: {e}", 500
        else:
            return "No access", 400


class UploadTradesFromJSON(Resource):
    @classmethod
    @jwt_required
    def post(cls):
        # Получаем данные из JSON запроса
        params_json = request.get_json()
        trades = params_json["trades"]
        user_id = get_jwt_identity()
        current_user = UserModel.find_by_role(user_id)
        if current_user.role in ["admin", "technician"]:
            try:
                # Проверяем, что данные пришли в виде списка словарей
                if not isinstance(trades, list):
                    return {"message": "Invalid data format. Expected a list of records."}, 400
                # Сохраняем данные в базе данных
                TradeModel.insert_many(trades)
                return {"message": f"{len(trades)} trades uploaded successfully"}, 201
            except Exception as e:
                return {"message": f"An error occurred: {str(e)}"}, 500
        else:
            return "No access", 400


class GetTradeAfterID(Resource):
    @classmethod
    def post(cls, id: int):
        try:
            print(id)
            trades = TradeModel.find_after_id(id=id)
            print(trades)
            return trades, 200
        except Exception as e:
            return {"error": str(e)}, 500


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

