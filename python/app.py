import copy
import sys
import pytz
import datetime
import sqlalchemy
import os
import logging
import threading
from flask import Flask, jsonify
from datetime import timedelta
from flask_restful import Api
from flask_cors import CORS
from flask_jwt_extended import (JWTManager, get_jwt_identity, jwt_required)
from marshmallow import ValidationError
from waitress import serve
from flask_socketio import SocketIO, emit, send, join_room
from flask import request
import time
import requests
# v2
from db import db
from db_postgres import db_postgres
from db_mongo import db_mongo
from ma import ma
from blacklist import BLACKLIST
from resources.telegram_notifications_and_alerts_bot import run_alert

basedir = os.path.abspath(os.path.dirname(__file__))


sys.path.append(f'{basedir}/resources')
from alerts import AddAlert, DeleteAlert, ChangeAlert
from telegram_ids import AddTelegramId, DeleteTelegramId, GetTelegramIds
from FinamPy.FinamPy import FinamPy
from finam import TradeOutAll, TradeOut, CancelAll, CancelStopOrder, CancelOrder, CreateStopOrder, SellMarket, \
    BuyMarket, CreateOrder, GetPortfolio, GetActiveOrders, GetActiveStopOrders, AutoSell, AutoBuy, SecuritiesFinam, \
    GetTradesList, Candles
from user import UserRegister, UserLogin, TokenRefresh, UserLogout, InfoUser, DellUser, EditUser, ChangePassword, AccessInfo, ListEmail
from dataset import WriteDataForFP, ReadData, ListData, DeleteData, FootPrintData, ReadDataTest, CustomdData, \
    GetCustomdData, read_json_from_gridfs, upload_json_to_gridfs, TvDataFeed, TvDataFeedDividends, GetGoogleTablesList
from token_finam import CreateToken, DellToken, InfoTokens
from trades import GetAllTrades, TradeAddToBd, GetTradesByUnionsAndTimeRange, GetTradesAndMetricsByUnionsAndTimeRange, \
    GetAllTradesOrders, GetTradesUnions, GetTradesTickersByUnion, GetTradesTickersWithCounts, \
    GetTradesByUnionTicker, GetTradesByUnions, UpdateTradeByID, DeleteTradeByID, GetTradeAfterID, UploadTradesFromJSON, DeleteTradesBeforeDate

from hidden_trades import GetAllHiddenTrades, GetHiddenTradesByNameShares, HiddenTradeAddToBd, GetHiddenTradesNames, \
    GetUniqueTradesNames, GetSharesByHiddenTradeName, GetMetricsByUnionsAndTimeRange, DeleteHiddenTradeByID, GetHiddenTradesByUnionsTimeRange

from portfolio import GetAll, PortfolioAddToBd, GetByDatetimeRange
from list_deals import GetAllDeals, GetAllDealsByUser, DealAddToBd, BulkAddDeals, UpdateDeal, UpdateDealByUserId, BulkDeleteDeals, BulkDeleteDealsByUserId
from sa_trivor_users import GetAllTrivorUser, GetAllTrivorUserByUser, TrivorUserAddToBd, BulkAddTrivorUser, UpdateTrivorUser, UpdateTrivorUserByUserId, BulkDeleteTrivorUser, BulkDeleteTrivorUserByUserId


# test
test_m = 12
db_m = db_mongo['123']

sqlUrl = sqlalchemy.engine.url.URL(
    drivername="mysql+pymysql",
    username="user1",
    password="Yi0(UmTR8z",
    host="rc1b-6nr140c17c253vli.mdb.yandexcloud.net",
    port=3306,
    database="db1",
    query={"ssl_ca": "../.mysql/root.crt"},
)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

logger = logging.getLogger('socketio')
logger.setLevel(logging.DEBUG)

# Создаем обработчик файла
file_handler = logging.FileHandler('app.log')
file_handler.setLevel(logging.DEBUG)

# Создаем форматтер и добавляем его к обработчику
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)

# Добавляем обработчик файла к логгеру
logger.addHandler(file_handler)

DB_USER = 'mgru_user'
DB_PASSWORD = 'MGRUPSQL_tayhhwga'
DB_HOST = '87.103.134.157'  # Global
DB_PORT = '6432'
DB_NAME = 'mgru_user'

DATABASE_URL = str(
        f'postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}'
        f':{DB_PORT}/{DB_NAME}',
    )


app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False


app.config['MAX_CONTENT_LENGTH'] = 60 * 1024 * 1024
app.config["SQLALCHEMY_DATABASE_URI"] = sqlUrl
app.config['SQLALCHEMY_BINDS'] = {
    'postgres': DATABASE_URL
}


app.config["PROPAGATE_EXCEPTIONS"] = True
app.config["JWT_BLACKLIST_ENABLED"] = True  # enable blacklist feature
app.config["JWT_BLACKLIST_TOKEN_CHECKS"] = [
    "access",
    "refresh",
]  # allow blacklisting for access and refresh tokens
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=30)
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)
# could do app.config['JWT_SECRET_KEY'] if we prefer
app.secret_key = "123"

api = Api(app, prefix='/api')
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet', pingTimeout=5000)

socketio.logger = logger


@app.before_first_request
def create_tables():
    db.create_all()
    #db_postgres.create_all()


@app.errorhandler(ValidationError)
def handle_marshmallow_validation(err):
    return jsonify({"errors": err.messages}), 400


jwt = JWTManager(app)


# This method will check if a token is blacklisted, and will be called automatically when blacklist is enabled
@jwt.token_in_blacklist_loader
def check_if_token_in_blacklist(decrypted_token):
    return decrypted_token["jti"] in BLACKLIST

api.add_resource(AccessInfo, "/user/access_info")
api.add_resource(DellUser, "/dellaccount")
api.add_resource(UserRegister, "/createaccount")
api.add_resource(ListEmail, "/emails")
api.add_resource(InfoUser, "/users")
api.add_resource(UserLogin, "/auth")
api.add_resource(TokenRefresh, "/refresh")
api.add_resource(UserLogout, "/logout")
api.add_resource(EditUser, "/edituser")
api.add_resource(ChangePassword, "/changepass")


api.add_resource(ReadDataTest, "/dataset_p8dvpe3dcnezte8hq491")
api.add_resource(ReadData, "/dataset")
api.add_resource(WriteDataForFP, "/write_data_for_fp")
api.add_resource(ListData, "/listdata")
api.add_resource(DeleteData, "/deletedata")
api.add_resource(FootPrintData, "/dataset_footprint")
api.add_resource(TvDataFeed, "/tvdata")
api.add_resource(TvDataFeedDividends, "/dividends")


api.add_resource(CustomdData, "/customdata")
api.add_resource(GetCustomdData, "/getcustomdata")
api.add_resource(GetGoogleTablesList, "/google_list")

# Deals List
api.add_resource(GetAllDeals, "/deal/list")
api.add_resource(GetAllDealsByUser, "/deal/list_by_id")
api.add_resource(DealAddToBd, "/deal/add")
api.add_resource(BulkAddDeals, "/deal/bulk_add")
api.add_resource(UpdateDeal, "/deal/update/<int:id>")
api.add_resource(UpdateDealByUserId, "/deal/update_by_id/<int:id>")
api.add_resource(BulkDeleteDeals, "/deal/dell")
api.add_resource(BulkDeleteDealsByUserId, "/deal/dell_by_id")

# Trivor setting
api.add_resource(GetAllTrivorUser, "/trivor_setting/list")
api.add_resource(GetAllTrivorUserByUser, "/trivor_setting/list_by_id")
api.add_resource(TrivorUserAddToBd, "/trivor_setting/add")
api.add_resource(BulkAddTrivorUser, "/trivor_setting/bulk_add")
api.add_resource(UpdateTrivorUser, "/trivor_setting/update/<int:id>")
api.add_resource(UpdateTrivorUserByUserId, "/trivor_setting/update_by_id/<int:id>")
api.add_resource(BulkDeleteTrivorUser, "/trivor_setting/dell")
api.add_resource(BulkDeleteTrivorUserByUserId, "/trivor_setting/dell_by_id")



# Finam API
api.add_resource(CreateToken, "/finam/create_token")
api.add_resource(InfoTokens, "/finam/info_tokens")
api.add_resource(DellToken, "/finam/dell_token")
api.add_resource(Candles, "/finam/candles")

api.add_resource(GetPortfolio, "/finam/portfolio")
api.add_resource(TradeOutAll, "/finam/trade_out_all")
api.add_resource(TradeOut, "/finam/trade_out")
api.add_resource(CancelAll, "/finam/cancel_all")
api.add_resource(CancelStopOrder, "/finam/cancel_stop_order")
api.add_resource(CancelOrder, "/finam/cancel_order")
api.add_resource(CreateStopOrder, "/finam/create_stop_order")
api.add_resource(SellMarket, "/finam/sell_market")
api.add_resource(BuyMarket, "/finam/buy_market")
api.add_resource(GetActiveStopOrders, "/finam/get_active_stop_orders")
api.add_resource(GetActiveOrders, "/finam/get_active_orders")
api.add_resource(CreateOrder, "/finam/create_order")
api.add_resource(AutoSell, "/finam/auto_sell")
api.add_resource(AutoBuy, "/finam/auto_buy")
api.add_resource(SecuritiesFinam, "/finam/securities")
api.add_resource(GetTradesList, "/finam/get_trades_list")

# Точки сделок и заявок из транзака
api.add_resource(GetAllTradesOrders, "/trades_orders/get_all")

# Portfolio

api.add_resource(PortfolioAddToBd, "/portfolio/add")
api.add_resource(GetAll, "/portfolio/get_all")
api.add_resource(GetByDatetimeRange, "/portfolio/get_by_datetime_range")

# Сделки
api.add_resource(TradeAddToBd, "/trades/add")
api.add_resource(GetAllTrades, "/trades/get_all")
api.add_resource(GetTradesByUnions, "/trades/get_by_unions")
api.add_resource(GetTradesByUnionTicker, "/trades/get_by_union_ticker")

api.add_resource(GetTradesUnions, "/trades/get_unions")
api.add_resource(GetTradesTickersByUnion, "/trades/get_tickers_by_union")
api.add_resource(GetTradesTickersWithCounts, "/trades/get_tickers_with_counts")
api.add_resource(GetTradesByUnionsAndTimeRange, "/trades/get_by_unions_and_times")
api.add_resource(GetTradesAndMetricsByUnionsAndTimeRange, "/trades/get_metrics_by_unions_and_times")

api.add_resource(UpdateTradeByID, "/trades/update_by_id/<int:id>")
api.add_resource(DeleteTradeByID, "/trades/delete_by_id/<int:id>")
api.add_resource(GetTradeAfterID, "/trades/get_after_id/<int:id>")
api.add_resource(UploadTradesFromJSON, "/trades/upload_trades_from_json")
api.add_resource(DeleteTradesBeforeDate, "/trades/delete_before_date")

# Скрытые Сделки
api.add_resource(GetAllHiddenTrades, "/hidden_trades/get_all")
api.add_resource(GetHiddenTradesByNameShares, "/hidden_trades/get_hidden_trades_by_name_shares")
api.add_resource(HiddenTradeAddToBd, "/hidden_trades/add")
api.add_resource(GetHiddenTradesNames, "/hidden_trades/get_hidden_trades_by_name")
api.add_resource(GetUniqueTradesNames, "/hidden_trades/get_unique_trades_names")
api.add_resource(GetHiddenTradesByUnionsTimeRange, "/hidden_trades/get_trades_by_unions_and_time_range")
api.add_resource(GetSharesByHiddenTradeName, "/hidden_trades/get_shares_by_name")
api.add_resource(GetMetricsByUnionsAndTimeRange, "/hidden_trades/get_metrics_by_names_and_times")

api.add_resource(DeleteHiddenTradeByID, "/hidden_trades/delete_by_id/<int:id>")


# Alerts
# Список активных алертов
# app.active_alerts = {}
# Блокировка работы со списком алертов в БД
app.now_alerts_in_work = False
# Блокировка работы со списком id для Telegram в БД
app.now_telegram_ids_in_work = False
# api.add_resource(GetAlerts, "/alerts/get_alerts")
api.add_resource(AddAlert, "/alerts/add_alert")
api.add_resource(DeleteAlert, "/alerts/delete_alert")
api.add_resource(ChangeAlert, "/alerts/change_alert")

# Id Telegram
api.add_resource(AddTelegramId, "/telegram/add_id")
api.add_resource(DeleteTelegramId, "/telegram/delete_id")
api.add_resource(GetTelegramIds, "/telegram/get_ids")

active_users = {}


def send_last_second_data_trades(account_number, sid):
    gmt = pytz.timezone('GMT')
    user_collection_name = account_number + '_finam_traders'

    collection = db_m[user_collection_name]

    while True:
        if sid in active_users:

            current_time = datetime.datetime.now()
            gmt = pytz.timezone('GMT')
            current_time_gmt = current_time.astimezone(gmt)
            start_unix_time = current_time_gmt.timestamp()
            end_unix_time = start_unix_time - 2

            data = list(collection.find({'timestamp': {'$gte': end_unix_time}}, {'_id': 0}))
            if (len(data) > 0):
                socketio.emit('trades_data', data, room=sid)
        else:
            break
        time.sleep(1)


def send_last_second_data_orders(account_number, sid):
    gmt = pytz.timezone('GMT')
    user_collection_name = account_number + '_finam_orders'

    collection = db_m[user_collection_name]

    while True:
        if sid in active_users:

            current_time = datetime.datetime.now()
            gmt = pytz.timezone('GMT')
            current_time_gmt = current_time.astimezone(gmt)
            start_unix_time = current_time_gmt.timestamp()
            end_unix_time = start_unix_time - 2

            data = list(collection.find({'timestamp': {'$gte': end_unix_time}}, {'_id': 0}))
            if (len(data) > 0):
                socketio.emit('orders_data', data, room=sid)
        else:
            break
        time.sleep(1)


# Получить копию алертов без токена
def list_without_private_data(_list):
    list_copy = copy.deepcopy(_list)
    for item in list_copy:
        del item['access_token']
    return list_copy


# Получить сид по номеру аккаунта
def get_sid_from_active_user(_account_number):
    for _sid in active_users:
        if active_users[_sid] == _account_number:
            return _sid


def price_volume_monitor():
    # print('active_alerts: ', app.active_alerts)
    while True:
        # Проверям не работает ли сейчас другая функция
        if app.now_alerts_in_work:
            time.sleep(0.1)
            continue
        # Указываем, что эта функция в работе
        app.now_alerts_in_work = True
        try:
            active_alerts = read_json_from_gridfs('Active_alerts')
            # print('active_alerts: ', active_alerts)
            # print('active_users: ', active_users)
            if active_alerts is not None:
                # Список для удаления аккаунта из списка алертов, если выполнятся все алерты для аккаунта
                active_alerts_changing = copy.deepcopy(active_alerts)
                active_alerts_original_copy = copy.deepcopy(active_alerts)
                for account_number in active_alerts_original_copy:
                    account_alerts_settings = active_alerts_original_copy[account_number]
                    for alert_settings in account_alerts_settings:
                        alert_volume = alert_settings['alert_volume']
                        alert_price = alert_settings['alert_price']
                        format = alert_settings['format']
                        security_board = alert_settings['security_board']
                        ticker = alert_settings['ticker']
                        access_token = alert_settings['access_token']
                        time_frame = alert_settings['time_frame']
                        from_date = alert_settings['last_candle_timestamp']
                        last_price = alert_settings['last_price']
                        # Параметры бота телеграм
                        bot_token = '123'
                        chat_id = '-123'

                        url = 'https://trade-api.finam.ru/api/v1/day-candles/' if format == "day" else 'https://trade-api.finam.ru/api/v1/intraday-candles/'
                        headers = {'X-Api-Key': access_token}

                        params = {
                            "securityCode": ticker,
                            "securityBoard": security_board,
                            "timeFrame": time_frame,
                            'interval.From': from_date,
                            'interval.Count': 500,
                        }
                        try:
                            response = requests.get(url, params=params, headers=headers)
                            if response.status_code == 200:
                                data_json = response.json()
                                candles = data_json['data']['candles']
                                last_candle = candles[len(candles) - 1]
                                for candle in candles:
                                    # print(alert_price, alert_volume, last_candle['timestamp'])
                                    # Устанавливаем дату из последней свечи (для дальнейшего получения свечей)
                                    for alert_settings_copy in active_alerts_changing[account_number]:
                                        if alert_settings_copy == alert_settings:
                                            alert_settings_copy['last_candle_timestamp'] = last_candle['timestamp']
                                    # Если поиск идет по цене:
                                    if alert_price and not alert_volume:
                                        high_price_in_candle = candle['high']['num'] / 10 ** candle['high']['scale']
                                        low_price_in_candle = candle['low']['num'] / 10 ** candle['low']['scale']
                                        # Цена алерта должна быть меньше последней цены и больше самой дешевой цены
                                        # Либо больше последней цены и меньше самой дорогой в свече
                                        if last_price >= alert_price >= low_price_in_candle or high_price_in_candle >= alert_price >= last_price:
                                            alert_data = {
                                                'securityCode': ticker,
                                                'candle': candle,
                                                'securityBoard': security_board,
                                                'timeFrame': time_frame,
                                                'alertPrice': alert_price
                                            }
                                            sid = get_sid_from_active_user(account_number)
                                            if sid:
                                                socketio.emit('alert_data', alert_data, room=sid)
                                            run_alert(bot_token, chat_id,
                                                      f"Alert price: {alert_price} Ticker: {ticker} \n"
                                                      f"Alert data: {alert_data}")
                                            # Удаляем из копии настройки алерта
                                            # print(active_alerts_changing[account_number])
                                            if alert_settings in active_alerts_changing[account_number]:
                                                active_alerts_changing[account_number].remove(alert_settings)
                                            # print(active_alerts_changing[account_number])
                                            # Удаляем аккаунт из копии, если все настройки отработали
                                            if not active_alerts_changing[account_number]:
                                                del active_alerts_changing[account_number]
                                            if sid:
                                                socketio.emit('list_alerts',
                                                              {'active_alerts': list_without_private_data(
                                                                  active_alerts_changing.get(account_number, []))},
                                                              room=sid)
                                    # Если поиск идет по объему
                                    elif alert_volume and not alert_price:
                                        volume_in_candle = candle['volume']
                                        if volume_in_candle >= alert_volume:
                                            alert_data = {
                                                'securityCode': ticker,
                                                'candle': candle,
                                                'securityBoard': security_board,
                                                'timeFrame': time_frame,
                                                'alertVolume': alert_volume
                                            }
                                            sid = get_sid_from_active_user(account_number)
                                            if sid:
                                                socketio.emit('alert_data', alert_data, room=sid)
                                            # print(bot_token, chat_id,
                                            #       f"Alert volume: {alert_volume} Ticker: {ticker} \n"
                                            #       f"Alert data: {alert_data}")
                                            run_alert(bot_token, chat_id,
                                                      f"Alert volume: {alert_volume} Ticker: {ticker} \n"
                                                      f"Alert data: {alert_data}")

                                            # Удаляем из копии настройки алерта
                                            if alert_settings in active_alerts_changing[account_number]:
                                                active_alerts_changing[account_number].remove(alert_settings)

                                            # Удаляем аккаунт из копии, если все настройки отработали
                                            if not active_alerts_changing[account_number]:
                                                del active_alerts_changing[account_number]
                                            if sid:
                                                socketio.emit('list_alerts',
                                                              {'active_alerts': list_without_private_data(
                                                                  active_alerts_changing.get(account_number, []))},
                                                              room=sid)
                            # Если слишком много обращений к API Finam
                            elif response.status_code == 429:
                                error_text = f"Cлишком много обращений к API Finam. Повторная попытка через 5 сек:\n " \
                                             f"Alert volume: {alert_volume} Alert price: {alert_price} Ticker: {ticker}"
                                sid = get_sid_from_active_user(account_number)
                                if sid:
                                    socketio.emit('alert_data', error_text, room=sid)
                                # run_alert(bot_token, chat_id, error_text)
                                time.sleep(5)
                            # Другие ошибки
                            else:
                                error_text = f'Ошибка. Отмена оповщения. {response.json()}'
                                sid = get_sid_from_active_user(account_number)
                                if sid:
                                    socketio.emit('alert_data', error_text, room=sid)
                                run_alert(bot_token, chat_id, error_text)
                                # Удаляем из копии настройки алерта
                                if alert_settings in active_alerts_changing[account_number]:
                                    active_alerts_changing[account_number].remove(alert_settings)
                                # Удаляем аккаунт из копии, если все настройки отработали
                                if not active_alerts_changing[account_number]:
                                    del active_alerts_changing[account_number]
                                if sid:
                                    socketio.emit('list_alerts', {'active_alerts': list_without_private_data(
                                        active_alerts_changing.get(account_number, []))}, room=sid)
                                # return {'error': response.status_code}, 400
                        except Exception as e:
                            error_text = f'Ошибка except. error: {e}'
                            sid = get_sid_from_active_user(account_number)
                            if sid:
                                socketio.emit('alert_data', error_text, room=sid)
                            run_alert(bot_token, chat_id, error_text)
                            # print('Ошибка')
                            # Удаляем из копии настройки алерта
                            if alert_settings in active_alerts_changing[account_number]:
                                active_alerts_changing[account_number].remove(alert_settings)
                            # Удаляем аккаунт из копии, если все настройки отработали
                            if not active_alerts_changing[account_number]:
                                del active_alerts_changing[account_number]
                            if sid:
                                socketio.emit('list_alerts', {'active_alerts': list_without_private_data(
                                    active_alerts_changing.get(account_number, []))}, room=sid)

                # Сравниваем объект в начале функции с объектом глобальным, который мог быть изменен по апи (добавление, удаление алерта)
                def find_differences(old_object, object_may_changed):
                    differences = {}
                    for key in old_object:
                        if key not in object_may_changed:
                            differences[key] = 'delete'
                        # elif old_object[key] != object_may_changed[key]:
                        #     differences[key] = object_may_changed[key]
                        else:
                            # Проверяем элементы списка по отдельности
                            for i, item in enumerate(old_object[key]):
                                if item not in object_may_changed[key]:
                                    differences.setdefault(key, []).append((item, 'delete'))
                    for key in object_may_changed:
                        if key not in old_object:
                            differences[key] = object_may_changed[key]
                        else:
                            # Проверяем элементы списка по отдельности
                            for i, item in enumerate(object_may_changed[key]):
                                if item not in old_object[key]:
                                    differences.setdefault(key, []).append((item, 'add'))
                    return differences

                # Удаляем, либо добавляем изменения
                # def apply_differences(changed_object, differences):
                #     copy_changed_object = copy.deepcopy(changed_object)
                #     for key, value in differences.items():
                #         # print(key, value)
                #         for difference in value:
                #             # print(difference[1], difference[0])
                #             for alert in copy_changed_object[key]:
                #                 # print('alert', alert)
                #                 if alert == difference[0] and difference[1] == 'delete':
                #                     # print('delete')
                #                     changed_object[key].remove(alert)
                #             if difference[0] not in changed_object[key] and difference[1] == 'add':
                #                 # print('add')
                #                 changed_object[key].append(difference[0])
                #         if not changed_object[key]:
                #             del changed_object[key]

                # Добавляем/удаляем изменения с апи в новый сформированный объект
                differences = find_differences(active_alerts_original_copy, active_alerts)
                # print('differences', differences)
                # apply_differences(active_alerts_changing, differences)
                # app.active_alerts = copy.deepcopy(active_alerts_changing)
                upload_json_to_gridfs(active_alerts_changing, 'Active_alerts')
                # Если были изменения отправляем список по сокету
                for _account_number in differences:
                    # print('_account_number', _account_number)
                    _sid = get_sid_from_active_user(_account_number)
                    if _sid:
                        socketio.emit('list_alerts',
                                      {'active_alerts': list_without_private_data(
                                          active_alerts_changing.get(_account_number, []))},
                                      room=_sid)
            # Указываем, что эта функция завершила работу
            app.now_alerts_in_work = False
            time.sleep(1)
        except Exception as e:
            print(e)
            # Указываем, что эта функция завершила работу
            app.now_alerts_in_work = False
            time.sleep(1)
            continue


@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('response', 'You are connected to the WebSocket')


@socketio.on('trades')
def handle_trades(message):
    print('on - trades')
    client_sid = request.sid
    account_number = message["account_number"]
    active_users[client_sid] = account_number
    print('0 connect to server for trades')
    send_data_thread = threading.Thread(target=send_last_second_data_trades, args=(account_number, client_sid))
    print('1 connect to server for trades')
    send_data_thread.start()
    print('2 connect to server for trades')
    emit('response', ' connect to server for trades', room=client_sid)


@socketio.on('orders')
def handle_orders(message):
    print('on - orders')
    client_sid = request.sid
    account_number = message["account_number"]
    active_users[client_sid] = account_number
    send_data_thread = threading.Thread(target=send_last_second_data_orders, args=(account_number, client_sid))
    send_data_thread.start()
    emit('response', ' connect to server for orders', room=client_sid)


@socketio.on('disconnect')
def handle_disconnect():
    print('on - disconnect')
    client_sid = request.sid
    if client_sid in active_users:
        del active_users[client_sid]
    print('Client disconnected')


# Сокет на алерты (добавление sid и получение списка алертов)
@socketio.on('alerts')
def handle_alerts(message):
    active_alerts = read_json_from_gridfs('Active_alerts') or {}
    print('on - alerts')
    client_sid = request.sid
    account_number = message["account_number"]
    active_users[client_sid] = account_number
    print('Connect to server for alerts', active_users, active_alerts)
    emit('response', 'Connect to server for alerts', room=client_sid)
    socketio.emit('list_alerts',
                  {'active_alerts': list_without_private_data(active_alerts.get(account_number, []))},
                  room=client_sid)


db.init_app(app)
ma.init_app(app)
# Создаем и запускаем поток для функции price_volume_monitor()
monitor_thread = threading.Thread(target=price_volume_monitor)
# monitor_thread.daemon = True  # Поток будет автоматически остановлен при завершении программы
monitor_thread.start()

if __name__ == '__main__':
    socketio.run(app, debug=True, port=8000)
