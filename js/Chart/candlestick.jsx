import {
  useEffect,
  useRef,
  useState
} from 'react';
import AnyChart from 'anychart-react';
import anychart from 'anychart';
import jwtAxios from '@crema/services/auth/JWT';
import 123 from '../API/132';
import io from 'socket.io-client';
import moment from 'moment';
import 'moment-timezone';
import CircularProgress from '@mui/material/CircularProgress';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import { useThemeContext } from '@crema/context/ThemeContextProvider';
import {
  ColorSelector,
  addAlpha
} from '../../tool/ColorSelector';
import {
  Box,
  Grid,
  FormControl,
  Divider,
  IconButton,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Popover,
} from '@mui/material';
import { useAuthUser } from '@crema/hooks/AuthHooks';

var dateBias = 16;

if (typeof anychart === 'object') {
  // create line Chart
  var stage = anychart.graphics.create();
  var chart = anychart.stock(); //anychart.rangeColumn();
  let grouping = chart.grouping();
  //grouping.enabled(false);
  var table = anychart.data.table('scroller');
  design_chart(chart, _, _, {}, 0);
}

export function CandlestickChart({
  setTriggerBuySell,
  buySellTrigger,
  token,
  timeFrame,
  ticker,
  trades,
  timeZone,
  requestFrom = 'Finam',
  selectedAccount,
}) {
  // console.log(ticker);
  const { user } = useAuthUser();
  const { theme } = useThemeContext();

  const securityCode = ticker[0]?.code || ticker[0]?.seccode;
  const securityBoard = ticker[0]?.board;
  const decimals = ticker[0]?.decimals;
  const minStep = ticker[0]?.minStep || ticker[0]?.minstep;

  const intervalRef = useRef();

  const [loadChart, setLoadChart] = useState(false);
  const [dataset, setDataset] = useState([]);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [isDatasetLoad, setIsDatasetLoad] = useState(false);
  const [datasetError, setDatasetError] = useState(false);
  const [updateCandlesInterval, setUpdateCandlesInterval] = useState(5);
  const [cursor, setCursor] = useState('default');
  // Сделки по диапазону дат свечей
  const [tradesWithCandlesRange, setTradesWithCandlesRange] = useState([]);
  const [socket, setSocket] = useState();
  const [currentSocketTimeFrame, setCurrentSocketTimeFrame] = useState();
  const [newSocketTimeFrame, setNewSocketTimeFrame] = useState();
  const [currentSocketTicker, setCurrentSocketTicker] = useState();
  const [newSocketTicker, setNewSocketTicker] = useState();
  const [candlestickColor, setCandlestickColor] = useState({
    fallingFill: 'black',
    fallingStroke: 'white',
    risingFill: 'white',
    risingStroke: 'black',
  });
  const [publickSeries, setPublickSeries] = useState([]);

  const [scrollerLoadData, setScrollerLoadData] = useState(false);

  useEffect(() => {
    themeChartGrid();
  });

  const themeChartGrid = () => {
    chart
      .plot(0)
      .yGrid()
      .enabled(true)
      .stroke({
        color: theme.palette.mode === 'dark' ? '#F0F0F0' : '#4a4a4a',
        thickness: 0.2,
      });

    chart
      .plot(0)
      .xMinorGrid()
      .enabled(true)
      .stroke({
        color: theme.palette.mode === 'dark' ? '#F0F0F0' : '#4a4a4a',
        thickness: 0.2,
      })
      .drawLastLine(false)
      .drawFirstLine(false);
  };

  const scaleOHLC = (listCandles) => {
    // console.log(listCandles);
    return listCandles.map((item) => {
      return {
        ...item,
        close: item.close.num * 10 ** -item.close.scale,
        high: item.high.num * 10 ** -item.high.scale,
        low: item.low.num * 10 ** -item.low.scale,
        open: item.open.num * 10 ** -item.open.scale,
        scroller: item?.timestamp || item?.date,
      };
    });
  };

  let attempt = 0  // Кол-во попыток запроса свечей
  async function getCandles() {
    setDatasetLoading(true);
    if (requestFrom === 'Finam') {
      const currentDate = new Date();
      const formattedCurrentDate = currentDate.toISOString();
      let fromtDate = new Date(); // текущая дата
      fromtDate.setDate(currentDate.getDate() - 30);
      fromtDate = fromtDate.toISOString();
      const params = {
        format: timeFrame === 'D1' ? 'day' : 'intraday',
        security_board: securityBoard,
        ticker: securityCode,
        access_token: token,
        timeFrame: timeFrame,
        from: timeFrame === 'D1' ? fromtDate.split('T')[0] : fromtDate,
        to:
          timeFrame === 'D1'
            ? formattedCurrentDate.split('T')[0]
            : formattedCurrentDate,
      };

      try {
        const response = await 123.getCandles(params);
        // console.log(response);
        setDatasetLoading(false);
        setIsDatasetLoad(true);
        const candles = scaleOHLC(response);
        setDataset(candles);
        return candles;
      }
      catch (error) {
        setDatasetLoading(false);
        setDatasetError(error);
        console.error('Ошибка получения данных:', error);
        attempt++;
        if (attempt < 3) {
          setTimeout(() => getCandles(params, timeFrame), 10000);
        }
        else {
          console.error('Превышено количество попыток получения данных.');
          throw error;
        }
      }
    }
    else if (requestFrom === 'TV') {
      const intervalConverter = {
        M1: '1',
        M5: '5',
        M15: '15',
        H1: '1H',
        D1: '1D',
      };
      let symbol = securityCode
      if (selectedAccount === "MOEX_F_HIDDEN_TRIVOR") symbol = securityCode.slice(0, -1) + "2024"; // Заменяем 4 на 2024 (пример SRU2024)
      const params = {
        token:
          '123.123.123-123-132-123',
        symbol: symbol,
        exchange: 'MOEX',
        n_bars: 10000,
        interval: intervalConverter[timeFrame],
      };
      try {
        const response = await 123.getCandlesTV(params);
        setDatasetLoading(false);
        setIsDatasetLoad(true);

        const candles = response.map((item) => {
          let _scroller = item?.datetime;
          if (timeFrame === 'D1') {
            // Создаем объект Date из временной метки
            const date = new Date(_scroller);
            // Получаем год, месяц и день
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Месяцы в JavaScript начинаются с 0
            const day = String(date.getDate()).padStart(2, '0');
            // Форматируем дату в строку "YYYY-MM-DD"
            _scroller = `${year}-${month}-${day}`;
          }
          return {
            ...item,
            scroller: _scroller,
            timestamp: item?.datetime,
          };
        });
        setDataset(candles);
        return candles;
      }
      catch (error) {
        setDatasetLoading(false);
        setDatasetError(error);
        console.error('Ошибка получения данных:', error);
        attempt++;
        if (attempt < 3) {
          setTimeout(() => getCandles(params, timeFrame), 10000);
        }
        else {
          console.error('Превышено количество попыток получения данных.');
          throw error;
        }
      }
    }
  }

  async function updateCandlesBefore(candles, date) {
    const parsedDate = new Date(date);
    parsedDate.setDate(parsedDate.getDate() - 30);

    const params =
      timeFrame === 'D1'
        ? {
          format: timeFrame === 'D1' ? 'day' : 'intraday',
          security_board: securityBoard,
          ticker: securityCode,
          access_token: token,
          timeFrame: timeFrame,
          to: timeFrame === 'D1' ? date.split('T')[0] : date,
        }
        : {
          format: timeFrame === 'D1' ? 'day' : 'intraday',
          security_board: securityBoard,
          ticker: securityCode,
          access_token: token,
          timeFrame: timeFrame,
          to: timeFrame === 'D1' ? date.split('T')[0] : date,
          from:
            timeFrame === 'D1'
              ? parsedDate.toISOString().split('T')[0]
              : parsedDate.toISOString(),
        };

    const response = await 123.getCandles(params);
    const newCandles = scaleOHLC(response);
    candles = [...newCandles, ...candles];
    setDataset(candles);
    return candles;
  }

  async function updateCandlesAfter(candles) {
    let candlesCopy = [...candles];
    const params = {
      format: timeFrame === 'D1' ? 'day' : 'intraday',
      security_board: securityBoard,
      ticker: securityCode,
      access_token: token,
      timeFrame: timeFrame,
      from: candlesCopy[candlesCopy.length - 1].scroller,
    };

    const response = await 123.getCandles(params);
    const newCandles = scaleOHLC(response);
    // console.log(newCandles);
    // candlesCopy.pop();
    // candlesCopy = [...candlesCopy, ...newCandles];
    // console.log(candlesCopy[candlesCopy.length - 1].close);
    // setDataset(candlesCopy);
    return newCandles;
  }

  // useEffect(() => {
  //     // URL для подключения
  //     const url = 'wss://data.tradingview.com/socket.io/websocket?from=chart%2FKdT34pmB%2F&date=2024_08_09-21_31&type=chart';
  //     // Создание нового WebSocket
  //     const _socket = new WebSocket(url);
  //     setSocket(_socket)
  //     // Обработчик события открытия соединения
  //     _socket.onopen = (event) => {
  //         console.log('WebSocket is open now.');
  //         // Аутентификация
  //         _socket.send('~m~702~m~{"m":"set_auth_token","p":["123.123.123-123-123"]}');
  //         // Установка локейла
  //         _socket.send('~m~34~m~{"m":"set_locale","p":["ru","RU"]}');
  //         // Создание сессии
  //         _socket.send('~m~55~m~{"m":"chart_create_session","p":["123",""]}');
  //     };
  //     // Обработчик события получения сообщения
  //     _socket.onmessage = (event) => {
  //         const message = event.data;
  //         // Продление сокета
  //         const regexResponse = /^~m~(\d+)~m~~h~(\d+)$/;
  //         if (regexResponse.test(message)) {
  //             _socket.send(message);
  //         }
  //         // Получение свечей
  //         if (message.startsWith('~m~19')) {
  //             console.log(message);
  //             // Регулярное выражение для поиска объектов, начинающихся с ~m~19
  //             const regexCandles = /~m~19\d+~m~\s*({.*?})\s*(?:~m~|$)/g;
  //
  //             // Массив для хранения найденных объектов
  //             const objects = [];
  //
  //             // Поиск всех совпадений
  //             let match;
  //             while ((match = regexCandles.exec(message)) !== null) {
  //                 try {
  //                     const parsedObject = JSON.parse(match[1]);
  //                     console.log(parsedObject.p[1].sds_1.lbs?.bar_close_time, parsedObject.p[1].sds_1.s[0].v);
  //                     objects.push(parsedObject);
  //                 } catch (e) {
  //                     console.error('Ошибка парсинга JSON:', e);
  //                 }
  //             }
  //         }
  //
  //     };
  //     // Обработчик события закрытия соединения
  //     _socket.onclose = (event) => {
  //         console.log('WebSocket is closed now.');
  //     };
  //     // Обработчик события ошибки
  //     _socket.onerror = (error) => {
  //         console.error('WebSocket error observed:', error);
  //     };
  //     console.log(_socket);
  // }, [])

  // Подготовить таймфрейм для сокета TradingView
  useEffect(() => {
    jwtAxios
      .get(
        'https://api.123.123/api/getcustomdata?name=colorCandlesTest:' +
        user.email
      )
      .then((json) => {
        if (json.data == null) {
          jwtAxios.post('https://api.123.123/api/customdata', {
            name: 'colorCandlesTest:' + user.email,
            data: candlestickColor,
          });
        }
        else {
          setCandlestickColor(json.data);
        }
      })
      .catch((e) => {
        console.log('ERROR: ' + e);
      });
  }, []);

  useEffect(() => {
    if (timeFrame) {
      switch (timeFrame) {
        case 'M1': {
          setNewSocketTimeFrame('1');
          break;
        }
        case 'M5': {
          setNewSocketTimeFrame('5');
          break;
        }
        case 'M15': {
          setNewSocketTimeFrame('15');
          break;
        }
        case 'H1': {
          setNewSocketTimeFrame('1H');
          break;
        }
        case 'D1': {
          setNewSocketTimeFrame('D1');
          break;
        }
        default:
          throw new Error('Неизвестный таймфрейм');
      }
    }
  }, [timeFrame]);

  // Подготовить имя тикера для сокета TradingView
  useEffect(() => {
    if (ticker[0]?.code) {
      const tickerMarket = ticker[0].market;
      const tickerCode = ticker[0].code;
      let newTickerMarket;
      switch (tickerMarket) {
        case 'MARKET_STOCK': {
          newTickerMarket = 'MOEX';
          break;
        }
        case 'MARKET_MMA': {
          newTickerMarket = 'NYSE';
          break;
        }
        case 'MARKET_FORTS': {
          newTickerMarket = 'ALOR';
          break;
        }
        case 'MARKET_BONDS': {
          newTickerMarket = 'ALOR'; // пока не ясно, заглушка
          break;
        }
        case 'MARKET_SPBEX': {
          newTickerMarket = 'ALOR'; // пока не ясно, заглушка
          break;
        }
        default:
          //console.log(ticker[0]);
          throw new Error('Неизвестный маркет');
      }
      setNewSocketTicker(newTickerMarket + ':' + tickerCode);
      // console.log(newTickerMarket + ':' + tickerCode)
    }
  }, [ticker]);

  useEffect(() => {
    if (securityCode && timeFrame && token) {
      setLoadChart(true);
      // Очистка интервала
      clearInterval(intervalRef.current);
      // Сбрасываем график
      if (chart.plot(0) !== undefined) {
        chart.dispose();
      }
      chart = anychart.stock();
      let grouping = chart.grouping();
      //grouping.enabled(false);
      design_chart(chart, timeZone, timeFrame, theme, decimals);
      // chart.plot(0).removeAllSeries()
      let dataForScroller = [];

      attempt = 0  //Сбрасываем кол-во попыток загрузки свечей
      getCandles()
        .then((candles, er) => {
          // console.log(candles);
          dataForScroller = candles;
          table.remove();
          table.addData(candles);
          // console.log(table.oc.b);
          const mapping = table.mapAs({
            open: 'open',
            high: 'high',
            low: 'low',
            close: 'close',
          });
          let candlestickChart = chart
            .plot(0)
            .candlestick(mapping)
            .name(securityCode);
          setPublickSeries(candlestickChart);

          candlestickChart.fallingFill(candlestickColor?.fallingFill); // Цвет падающих свечей (down candles)
          candlestickChart.fallingStroke(candlestickColor?.fallingStroke);
          candlestickChart.risingFill(candlestickColor?.risingFill); // Цвет растущих свечей (up candles)
          candlestickChart.risingStroke(candlestickColor?.risingStroke);
          candlestickChart.zIndex(0);

          // График области скрола
          let scrollerChart = chart.scroller();
          scrollerChart.candlestick(mapping);
          scrollerChart.thumbs(false);
          chart.selectRange(
            candles[parseInt(candles.length / 1.8)].scroller,
            candles[candles.length - 1].scroller
          );

          var controller = chart.plot(0).annotations();

          // console.log(table.oc.b[table.oc.b.length-1].values);

          // create a Horizontal Line annotation
          /*controller.horizontalLine({
           valueAnchor: candles[candles.length - 1].low,
           normal: { stroke: '3 green' },
           idName: 'buy',
           });

           controller.horizontalLine({
           valueAnchor: candles[candles.length - 1].high,
           normal: { stroke: '3 red' },
           });*/

          // Обновляем свечи каждые n секунд
          // Установка интервала
          if (requestFrom === 'Finam') {
            intervalRef.current = setInterval(async function () {
              const newCandles = await updateCandlesAfter(candles);
              candles = [...candles, ...newCandles];
              table.addData(newCandles);
            }, 5000);
          }

          chart.listen('selectedrangechange', function (event) {
            if (event.firstKey === event.firstSelected) {
              if (!scrollerLoadData) {
                setScrollerLoadData(true);
                let currentRange = [event.firstSelected, event.lastSelected];
                currentRange[0] = new Date(currentRange[0] + 10000000);
                currentRange[1] = new Date(currentRange[1]);

                const toDate = new Date(event.firstSelected);

                setTimeout(() => {}, 500);
                updateCandlesBefore(candles, toDate.toISOString()).then(
                  (newCandles) => {
                    dataForScroller = newCandles;
                    // Немного сдвигаем, чтобы опять не остаться на 1ой позиции

                    chart.selectRange(
                      currentRange[0].toISOString(),
                      currentRange[1].toISOString()
                    );
                    table.addData(newCandles);

                    // Сдвигаем до предыдущего значения (до подгрузки)
                    chart.selectRange(
                      currentRange[0].toISOString(),
                      currentRange[1].toISOString()
                    );
                    setScrollerLoadData(false);
                  }
                );
              }
            }
            else {
              try {
                function unixToISO(unixTimestamp) {
                  const date = new Date(unixTimestamp);
                  return date.toISOString().split('.')[0] + 'Z';
                }

                const endDate = unixToISO(event.lastSelected);
                const startDate = unixToISO(event.firstSelected);
                const dataset = chart
                  .plot(0)
                  .getSeriesAt(0)
                  .data()
                  .ez.oc.b.map((obj) => obj.values);

                const selectedData = dataset.filter(
                  (item) =>
                    item.timestamp >= startDate && item.timestamp <= endDate
                );

                const highestHigh = selectedData.reduce(
                  (max, item) => (item.high > max ? item.high : max),
                  0
                );
                const lowestLow = selectedData.reduce(
                  (min, item) => (item.low < min ? item.low : min),
                  Infinity
                );

                chart.plot(0).yScale().minimumGap(0);
                chart.plot(0).yScale().maximumGap(0);
                if (lowestLow !== Infinity) {
                  chart
                    .plot(0)
                    .yScale()
                    .minimum(lowestLow - (highestHigh - lowestLow) * 0.15);
                  chart
                    .plot(0)
                    .yScale()
                    .maximum(highestHigh + (highestHigh - lowestLow) * 0.15);
                  chart
                    .plot(0)
                    .yScale()
                    .ticks()
                    .interval((highestHigh - lowestLow) / 10);
                }
              }
              catch {
                console.log('error');
              }
            }
          });

          chart.listen('annotationChangeFinish', function (e) {
            // const value = e.annotation.Oa.valueAnchor;
            const value = parseFloat(
              (
                Math.round(
                  e.annotation.Oa.valueAnchor / (minStep * 10 ** -decimals)
                ) *
                (minStep * 10 ** -decimals)
              ).toFixed(decimals)
            );
            if (
              chart.plot(0).annotations().getAnnotationAt(0) === e.annotation
            ) {
              //console.log('green', value);
              setTriggerBuySell([value, buySellTrigger[1]]);
            }
            else if (
              chart.plot(0).annotations().getAnnotationAt(1) === e.annotation
            ) {
              //console.log('red', value);
              setTriggerBuySell([buySellTrigger[0], value]);
            }
            // console.log(typeof(value));
            // console.log(e);
          });
          setLoadChart(false);
        })
        .catch((error) => {
          // Обработка ошибки
          console.error('Ошибка при выполнении getCandles:', error);
          setLoadChart(false);
        });

      // Очистка интервала при размонтировании компонента
      return () => {
        clearInterval(intervalRef.current);
      };
    }
  }, [securityCode, timeFrame, token]);

  useEffect(() => {
    if (tradesWithCandlesRange?.length) {
      let ppTradesList = [];
      if (tradesWithCandlesRange[0]?.name !== undefined) {
        tradesWithCandlesRange.forEach((trade) => {
          ppTradesList = [
            ...ppTradesList,
            ...[
              {
                buysell: trade.buysell,
                timeCandle: adjustDate(
                  addHoursToDate(trade.date_buy, dateBias),
                  timeFrame
                ),
                timeFrame,
                price: trade.buy_price,
              },
              {
                buysell: trade.buysell == 'B' ? 'S' : 'B',
                timeCandle: adjustDate(
                  addHoursToDate(trade.date_close, dateBias),
                  timeFrame
                ),
                timeFrame,
                price: trade.curent_price,
              },
            ],
          ];
        });
      }
      else {
        ppTradesList = tradesWithCandlesRange;
      }
      const relatedTrades = pairTrades(tradesWithCandlesRange, timeFrame);

      // Удаляем предыдущие слои маркеров
      chart.plot(0).removeSeries('tradesBuyLayer');
      chart.plot(0).removeSeries('tradesSellLayer');

      // Массив данных для маркеров Покупок
      let tradesBuy = ppTradesList
        .filter((trade) => trade.buysell === 'B')
        .map(function (trade) {
          return {
            x: trade.timeCandle,
            value: trade.price,
          };
        });

      // tradesBuy.push({
      //     x: '2024-06-26T20:44:00Z',
      //     value: 224.5,
      // });

      let tableMarkers = anychart.data.table('x');
      tableMarkers.addData(tradesBuy);

      let mapping = tableMarkers.mapAs({
        x: 'x',
        value: 'value',
      });

      // соединяем маркеры
      var controller = chart.plot(0).annotations();
      controller.removeAllAnnotations();
      // console.log(relatedTrades);
      relatedTrades.forEach(function (deal) {
        let currentPair = {}
        for (const trade of deal) {
          if (!currentPair?.startDate) {
            currentPair['startDate'] = trade.timeCandle;
            currentPair['startValue'] = trade.price;
          }
          else if (!currentPair?.endDate) {
            currentPair['endDate'] = trade.timeCandle;
            currentPair['endValue'] = trade.price;
          }
          else {
            currentPair['startDate'] = currentPair?.endDate;
            currentPair['startValue'] = currentPair?.endValue;
            currentPair['endDate'] = trade.timeCandle;
            currentPair['endValue'] = trade.price;
          }
          // console.log(trade, currentPair);
          if (currentPair?.endDate) {
            const startDate = currentPair['startDate'];
            const startValue = currentPair['startValue'];
            const endDate = currentPair['endDate'];
            const endValue = currentPair['endValue'];

            // Добавляем аннотацию типа линия (line)
            var annotation = controller.line({
              xAnchor: startDate,
              valueAnchor: startValue,
              secondXAnchor: endDate,
              secondValueAnchor: endValue,
            });
            // console.log(trade.profit);

            // Настраиваем пунктирную линию для аннотации
            annotation.stroke({
              color: trade.profit > 0 ? 'rgba(21,129,73,0.5)' : 'rgba(129,21,21,0.5)', // Цвет линии
              thickness: 3, // Толщина линии
              dash: '5 5', // Пунктирная линия (5px линия, 5px пробел)
            });

            annotation.allowEdit(false);
          }
        }
      });
      // Создаем слой для маркеров
      let tradesBuyLayer = chart.plot(0).marker(mapping);
      tradesBuyLayer.zIndex(100);
      tradesBuyLayer.name('BUY');
      tradesBuyLayer.id('tradesBuyLayer');
      tradesBuyLayer.type('triangle-up');
      tradesBuyLayer.fill('green');
      tradesBuyLayer.stroke('green');
      tradesBuyLayer.size(7);

      // Массив данных для маркеров Продаж
      let tradesSell = ppTradesList.filter((trade) => trade.buysell === 'S');
      // console.log('tradesSell: ', tradesSell);

      // tradesSell.push({
      //     x: '2024-06-26T20:45:00Z',
      //     value: 224.55,
      // });

      let tableMarkersSell = anychart.data.table('timeCandle');
      tableMarkersSell.addData(tradesSell);

      let mappingSell = tableMarkersSell.mapAs({
        value: 'price',
        openTrade: 'open',
        closeTrade: 'close',
      });
      // Создаем слой для маркеров
      let tradesSellLayer = chart.plot(0).marker(mappingSell);
      tradesSellLayer.zIndex(100);
      tradesSellLayer.name('SELL');
      tradesSellLayer.id('tradesSellLayer');
      tradesSellLayer.type('triangle-down');
      tradesSellLayer.fill('red');
      tradesSellLayer.stroke('red');
      tradesSellLayer.size(7);
    }
  }, [tradesWithCandlesRange]);

  // Обрезаем сделки по диапазону дат полученный свечей
  useEffect(() => {
    if (trades?.length && dataset?.length) {
      // console.log(trades);
      let tradesWithRange = [];
      trades.forEach((trade) => {
        function adjustDate(date) {
          switch (timeFrame) {
            case 'M1': {
              date.setSeconds(0);
              date.setMilliseconds(0);
              break;
            }
            case 'M5': {
              let minutes5 = Math.floor(date.getMinutes() / 5) * 5;
              date.setMinutes(minutes5);
              date.setSeconds(0);
              date.setMilliseconds(0);
              break;
            }
            case 'M15': {
              let minutes15 = Math.floor(date.getMinutes() / 15) * 15;
              date.setMinutes(minutes15);
              date.setSeconds(0);
              date.setMilliseconds(0);
              break;
            }
            case 'H1': {
              date.setMinutes(0);
              date.setSeconds(0);
              date.setMilliseconds(0);
              break;
            }
            case 'D1': {
              date.setHours(0);
              date.setMinutes(0);
              date.setSeconds(0);
              date.setMilliseconds(0);
              break;
            }
            default:
              throw new Error('Неизвестный таймфрейм');
          }
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');

          let formattedDate;
          if (timeFrame === 'D1') formattedDate = `${year}-${month}-${day}`;
          else
            formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
          return formattedDate;
        }

        const tradeTime = new Date(trade.time);
        const firstCandleDateTime = new Date(
          dataset[0]?.timestamp || dataset[0]?.date
        );
        const lastCandleDateTime = new Date(
          dataset[dataset.length - 1]?.timestamp ||
          dataset[dataset.length - 1]?.date
        );

        if (
          firstCandleDateTime <= tradeTime &&
          tradeTime <= lastCandleDateTime
        ) {
          // console.log(tradeTime, firstCandleDateTime, lastCandleDateTime)
          // console.log(trade.time);
          // console.log(tradeTime)
          trade.timeCandle = adjustDate(tradeTime);
          // console.log(trade.timeCandle)
          tradesWithRange.push(trade);
        }
      });
      setTradesWithCandlesRange(tradesWithRange);
    }
  }, [trades, dataset]);

  // задаем часовой пояс
  useEffect(() => {
    if (timeFrame !== 'D1') {
      chart
        .plot(0)
        .xAxis()
        .minorLabels()
        .format((value) => {
          // Преобразование времени в желаемый часовой пояс
          let date = moment.utc(value.dataValue).tz(timeZone);
          let formattedTime = date.format('HH:mm');

          // Возвращаем отформатированное время
          return formattedTime;
        });
    }
    // Перекрестие
    chart
      .plot(0)
      .crosshair()
      .xLabel()
      .format((value) => {
        // Преобразование времени в желаемый часовой пояс (например, 'America/New_York')
        let date;
        let formattedTime;
        if (timeFrame === 'D1') {
          date = moment.utc(value.rawValue).tz('Africa/Abidjan');
          formattedTime = date.format('DD.MM.yyyy');
        }
        else {
          date = moment.utc(value.rawValue).tz(timeZone);
          formattedTime = date.format('DD.MM.yyyy HH:mm');
        }

        // Возвращаем отформатированное время
        return formattedTime;

        // anychart.format.dateTime(value.rawValue, "dd.MM.yyyy HH:mm:ss")
      });
  }, [timeZone]);

  // useEffect(() => {
  //     setBoardTV('')
  //     if (selectedAccount && requestFrom === 'TV'){
  //         console.log(selectedAccount);
  //         switch (selectedAccount.split('_')[0]) {
  //             case 'ESP':
  //                 setBoardTV('BME:')
  //                 break;
  //             case 'AMER':
  //                 setBoardTV('')
  //                 break;
  //         }
  //     }
  // }, [selectedAccount])

  // Открываем сокет TradingView
  // useEffect(() => {
  //     // URL для подключения
  //     const url = 'wss://data.tradingview.com/socket.io/websocket?from=chart%123%2F&date=2024_08_09-21_31&type=chart';
  //     // Создание нового WebSocket
  //     const _socket = new WebSocket(url);
  //
  //     // Обработчик события открытия соединения
  //     _socket.onopen = (event) => {
  //         console.log('WebSocket is open now.');
  //         // Аутентификация
  //         _socket.send('~m~702~m~{"m":"set_auth_token","p":["123.123.123-123-123"]}');
  //         // Установка локейла
  //         _socket.send('~m~34~m~{"m":"set_locale","p":["ru","RU"]}');
  //         // Создание сессии
  //         _socket.send('~m~55~m~{"m":"chart_create_session","p":["1223",""]}');
  //     };
  //
  //     // Обработчик события получения сообщения
  //     _socket.onmessage = (event) => {
  //         const message = event.data;
  //         // Продление сокета
  //         const regexResponse = /^~m~(\d+)~m~~h~(\d+)$/;
  //         if (regexResponse.test(message)) {
  //             _socket.send(message);
  //         }
  //         // Получение свечей
  //         if (message.startsWith('~m~19')) {
  //             console.log(message);
  //             // Регулярное выражение для поиска объектов, начинающихся с ~m~19
  //             const regexCandles = /~m~19\d+~m~\s*({.*?})\s*(?:~m~|$)/g;
  //
  //             // Массив для хранения найденных объектов
  //             const objects = [];
  //
  //             // Поиск всех совпадений
  //             let match;
  //             while ((match = regexCandles.exec(message)) !== null) {
  //                 try {
  //                     const parsedObject = JSON.parse(match[1]);
  //                     console.log(parsedObject.p[1].sds_1.lbs?.bar_close_time, parsedObject.p[1].sds_1.s[0].v);
  //                     objects.push(parsedObject);
  //                 } catch (e) {
  //                     console.error('Ошибка парсинга JSON:', e);
  //                 }
  //             }
  //         }
  //
  //     };
  //
  //     // Обработчик события закрытия соединения
  //     _socket.onclose = (event) => {
  //         console.log('WebSocket is closed now.');
  //     };
  //
  //     // Обработчик события ошибки
  //     _socket.onerror = (error) => {
  //         console.error('WebSocket error observed:', error);
  //     };
  //     setSocket(_socket)
  //     console.log(_socket);
  // }, [])

  // Задаем тикер для сокета TradingView
  // useEffect(() => {
  //     if (dataset.length
  //         && newSocketTicker
  //         && newSocketTimeFrame
  //         && (newSocketTicker !== currentSocketTicker || newSocketTimeFrame !== currentSocketTimeFrame)
  //     ) {
  //         if (socket && socket.readyState === WebSocket.OPEN) {
  //             console.log('Closing socket:', socket);
  //             socket.close();
  //         }
  //         // URL для подключения
  //         const url = 'wss://data.tradingview.com/socket.io/websocket?from=chart%2FKdT34pmB%2F&date=2024_08_09-21_31&type=chart';
  //         // Создание нового WebSocket
  //         const _socket = new WebSocket(url);
  //         setSocket(_socket)
  //         // Обработчик события открытия соединения
  //         _socket.onopen = (event) => {
  //             console.log('WebSocket is open now.');
  //             // Аутентификация
  //             _socket.send('~m~702~m~{"m":"set_auth_token","p":["123.123.132-132-123"]}');
  //             // Установка локейла
  //             _socket.send('~m~34~m~{"m":"set_locale","p":["ru","RU"]}');
  //             // Создание сессии
  //             _socket.send('~m~55~m~{"m":"chart_create_session","p":["123",""]}');
  //
  //             _socket.send('~m~162~m~{' +
  //                 '"m":"resolve_symbol",' +
  //                 '"p":["cs_yDuTGxJ2N5sR","sds_sym_1",' +
  //                 '"={\\"adjustment\\":\\"splits\\",' +
  //                 '\\"currency-id\\":\\"RUB\\",' +
  //                 '\\"session\\":\\"regular\\",' +
  //                 '\\"symbol\\":\\"' +
  //                 newSocketTicker + '\\"}"]}')
  //             // Таймфрейм
  //             _socket.send('~m~81~m~{' +
  //                 '"m":"create_series",' +
  //                 '"p":["cs_yDuTGxJ2N5sR","sds_1","s1","sds_sym_1","' +
  //                 newSocketTimeFrame +
  //                 '",300,""]}');
  //         };
  //         // Обработчик события получения сообщения
  //         _socket.onmessage = (event) => {
  //             const message = event.data;
  //             // Продление сокета
  //             const regexResponse = /^~m~(\d+)~m~~h~(\d+)$/;
  //             if (regexResponse.test(message)) {
  //                 _socket.send(message);
  //             }
  //             // Получение свечей
  //             if (message.startsWith('~m~19')) {
  //                 console.log(message);
  //                 // Регулярное выражение для поиска объектов, начинающихся с ~m~19
  //                 const regexCandles = /~m~19\d+~m~\s*({.*?})\s*(?:~m~|$)/g;
  //
  //                 // Массив для хранения найденных объектов
  //                 const objects = [];
  //
  //                 // Поиск всех совпадений
  //                 let match;
  //                 while ((match = regexCandles.exec(message)) !== null) {
  //                     try {
  //                         const parsedObject = JSON.parse(match[1]);
  //                         console.log(parsedObject.p[1].sds_1.lbs?.bar_close_time, parsedObject.p[1].sds_1.s[0].v);
  //                         objects.push(parsedObject);
  //                     } catch (e) {
  //                         console.error('Ошибка парсинга JSON:', e);
  //                     }
  //                 }
  //             }
  //
  //         };
  //         // Обработчик события закрытия соединения
  //         _socket.onclose = (event) => {
  //             console.log('WebSocket is closed now.');
  //         };
  //         // Обработчик события ошибки
  //         _socket.onerror = (error) => {
  //             console.error('WebSocket error observed:', error);
  //         };
  //         console.log(_socket);
  //         setCurrentSocketTicker(newSocketTicker)
  //         setCurrentSocketTimeFrame(newSocketTimeFrame)
  //     }
  // }, [dataset, newSocketTicker, socket, newSocketTimeFrame])

  // Задаем таймфрейм для сокета TradingView
  // useEffect(() => {
  //     if (currentSocketTicker && socketTimeFrame) {
  //         // Таймфрейм
  //         socket.send('~m~81~m~{' +
  //             '"m":"create_series",' +
  //             '"p":["cs_yDuTGxJ2N5sR","sds_1","s1","sds_sym_1","' +
  //             socketTimeFrame +
  //             '",300,""]}');
  //     }
  // }, [dataset, currentSocketTicker, socketTimeFrame])

  return loadChart ? (
    <Box sx={{ display: 'flex' }}>
      <CircularProgress/>
    </Box>
  ) : (
    <div id="windowApp">
      <Chart
        datasetLoading={datasetLoading}
        stage={stage}
        chart={chart}
        seterColor={setCandlestickColor}
        geterColor={candlestickColor}
        series={publickSeries}
      />
    </div>
  );
}

const Chart = ({
  dataLoading,
  isDataLoading,
  stage,
  chart,
  seterColor,
  geterColor,
  series,
}) => {
  return dataLoading ? (
    <div id="loader"></div>
  ) : (
    <Box id="windowApp">
      <AnyChart
        instance={stage}
        id="stock-chart"
        width="100%"
        charts={[chart]}
      />

      <MenuBox
        seterColor={seterColor}
        geterColor={geterColor}
        series={series}
      />
    </Box>
  );
};

const MenuBox = ({
  seterColor,
  geterColor,
  series
}) => {
  const [openColorBox, setOpenColorBox] = useState(false);
  return (
    <Box sx={{
      position: 'absolute',
      bottom: 20,
      right: 0
    }}>
      <IconButton
        aria-label="close"
        color="inherit"
        size="medium"
        onClick={() => {
          setOpenColorBox(true);
        }}
      >
        <FormatColorFillIcon fontSize="medium"/>
      </IconButton>
      <ColorBox
        seterColor={seterColor}
        geterColor={geterColor}
        open={openColorBox}
        setOpen={setOpenColorBox}
        series={series}
      />
    </Box>
  );
};

const ColorBox = ({
  open,
  setOpen,
  seterColor,
  geterColor,
  series
}) => {
  useEffect(() => { }, []);

  const handleClose = () => {
    setOpen(false);
  };

  const { user } = useAuthUser();

  return (
    <div>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle id="alert-dialog-title">{'Colors'}</DialogTitle>
        <DialogContent>
          <FormControl sx={{ width: 150 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                Down candles
              </Grid>
              <Grid item xs={1}></Grid>
              <Grid item xs={5}>
                fill:
              </Grid>
              <Grid item xs={6}>
                <FormControl sx={{
                  display: 'inline-block',
                  float: 'right'
                }}>
                  <ColorSelector
                    disabled={true}
                    key={'color'}
                    bgColor={geterColor?.fallingFill}
                    id={'color_'}
                    funcColor={(color) => {
                      const colorHex = addAlpha(color.hex, color.rgb.a);
                      seterColor({
                        ...geterColor,
                        fallingFill: colorHex
                      });
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={1}></Grid>
              <Grid item xs={5}>
                stroke:
              </Grid>
              <Grid item xs={6}>
                <FormControl sx={{
                  display: 'inline-block',
                  float: 'right'
                }}>
                  <ColorSelector
                    disabled={true}
                    key={'color'}
                    bgColor={geterColor?.fallingStroke}
                    id={'color_'}
                    funcColor={(color) => {
                      const colorHex = addAlpha(color.hex, color.rgb.a);
                      seterColor({
                        ...geterColor,
                        fallingStroke: colorHex
                      });
                    }}
                  />
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                Up candles
              </Grid>
              <Grid item xs={1}></Grid>
              <Grid item xs={5}>
                fill:
              </Grid>
              <Grid item xs={6}>
                <FormControl sx={{
                  display: 'inline-block',
                  float: 'right'
                }}>
                  <ColorSelector
                    disabled={true}
                    key={'color'}
                    bgColor={geterColor?.risingFill}
                    id={'color_'}
                    funcColor={(color) => {
                      const colorHex = addAlpha(color.hex, color.rgb.a);
                      seterColor({
                        ...geterColor,
                        risingFill: colorHex
                      });
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={1}></Grid>
              <Grid item xs={5}>
                stroke:
              </Grid>
              <Grid item xs={6}>
                <FormControl sx={{
                  display: 'inline-block',
                  float: 'right'
                }}>
                  <ColorSelector
                    disabled={true}
                    key={'color'}
                    bgColor={geterColor?.risingStroke}
                    id={'color_'}
                    funcColor={(color) => {
                      const colorHex = addAlpha(color.hex, color.rgb.a);
                      seterColor({
                        ...geterColor,
                        risingStroke: colorHex
                      });
                    }}
                  />
                </FormControl>
              </Grid>
            </Grid>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            color="primary"
            variant="contained"
            onClick={() => {
              const defaultColor = {
                fallingFill: 'black',
                fallingStroke: 'white',
                risingFill: 'white',
                risingStroke: 'black',
              };
              series.fallingFill(defaultColor?.fallingFill);
              series.fallingStroke(defaultColor?.fallingStroke);
              series.risingFill(defaultColor?.risingFill);
              series.risingStroke(defaultColor?.risingStroke);
              seterColor(defaultColor);
              jwtAxios.post('https://api.123.123/api/customdata', {
                name: 'colorCandlesTest:' + user.email,
                data: defaultColor,
              });
            }}
          >
            Сброс
          </Button>
          <Button color="primary" variant="contained" onClick={handleClose}>
            Отмена
          </Button>
          <Button
            color="primary"
            variant="contained"
            onClick={() => {
              series.fallingFill(geterColor?.fallingFill);
              series.fallingStroke(geterColor?.fallingStroke);
              series.risingFill(geterColor?.risingFill);
              series.risingStroke(geterColor?.risingStroke);
              jwtAxios.post('https://api.123.123/api/customdata', {
                name: 'colorCandlesTest:' + user.email,
                data: geterColor,
              });
            }}
            autoFocus
          >
            Принять
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

function design_chart(ch, timeZone, timeFrame, theme, decimals) {
  // console.log(decimals);

  // Tooltip
  let tooltip = ch.tooltip();
  tooltip.titleFormat((value) => {
    // Преобразование времени в желаемый часовой пояс (например, 'America/New_York')
    let date = moment.utc(value.x).tz(timeZone);
    let formattedTime
    if (timeFrame !== 'D1') formattedTime = date.format('DD.MM.yyyy HH:mm');
    else formattedTime = date.format('DD.MM.yyyy');
    // Возвращаем отформатированное время
    return formattedTime;
  });
  // tooltip.displayMode("single")
  tooltip.format(function () {
    // console.log(this);

    // Проверяем название серии и наличие значений, чтобы избежать `undefined`
    if ((this.seriesName === 'BUY' || this.seriesName === 'SELL') && this.value !== undefined) {
      return this.seriesName + ': ' + this.value + ', руб.';
    }
    else if (this.open !== undefined && this.close !== undefined && this.low !== undefined && this.high !== undefined) {
      return 'candle:\n' +
             'open: ' + this.open.toFixed(decimals) + '\n' +
             'close: ' + this.close.toFixed(decimals) + '\n' +
             'low: ' + this.low.toFixed(decimals) + '\n' +
             'high: ' + this.high.toFixed(decimals) + '\n';
    }
    // Возвращаем пустую строку, если нет данных для отображения
    return '';
  });

  // Индикатор цены справа
  const priceIndicator = ch.plot(0).priceIndicator();
  priceIndicator.axis(ch.plot(0).yAxis(1));
  priceIndicator.value('series-end');
  priceIndicator.valueField('close');
  priceIndicator.fallingStroke('#f03645');
  priceIndicator.fallingLabel({ background: '#f03645' });
  priceIndicator.risingStroke('#089881');
  priceIndicator.risingLabel({ background: '#089881' });

  // Перекрестие
  const crosshair = chart.plot(0).crosshair();
  crosshair.xStroke('#888888', 0.5, '3 3', 'round');
  // Ошибка в торговом терминале
  crosshair.xLabel().format((value) => {
    // Преобразование времени в желаемый часовой пояс (например, 'America/New_York')
    let date;
    let formattedTime;
    if (timeFrame === 'D1') {
      date = moment.utc(value.rawValue).tz('Africa/Abidjan');
      formattedTime = date.format('DD.MM.yyyy');
    }
    else {
      date = moment.utc(value.rawValue).tz(timeZone);
      formattedTime = date.format('DD.MM.yyyy HH:mm');
    }

    // Возвращаем отформатированное время
    return formattedTime;

    // anychart.format.dateTime(value.rawValue, "dd.MM.yyyy HH:mm:ss")
  });
  crosshair.xLabel().fontColor('white');
  crosshair.xLabel().background(
    theme?.palette?.mode === 'dark'
      ? {
        fill: '#888888',
        stroke: '#888888',
      }
      : {
        fill: '#888888',
        stroke: '#888888',
      }
  );
  // crosshair.yLabel().enabled(false)
  crosshair.yLabel().axisIndex(1);
  crosshair.yLabel().format('{%Value}');
  crosshair.yLabel().fontColor('white');
  crosshair.yLabel().background({
    fill: '#888888',
    stroke: '#888888',
  });
  crosshair.yStroke('#757883', 0.5, '3 3', 'round');

  // chart.crosshair().displayMode('float');

  ch.bounds(0, 0, '100%', '100%');
  ch.background({ fill: '#FFFFFF00 0' });
  // chart.plot(0).yScale().minimumGap(0.1);
  // chart.plot(0).yScale().maximumGap(0.1);
  ch.interactivity().zoomOnMouseWheel(true);

  ch.plot(0).yAxis(0).enabled(false);
  ch.plot(0).yAxis(1).orientation('right');
  ch.padding().right(100);
  ch.plot(0)
    .xAxis()
    .labels()
    .format((value) => {
      return anychart.format.dateTime(value.dataValue, 'dd MMM');
    });
  ch.plot(0)
    .xAxis()
    .minorLabels()
    // Ошибка в торговом терминале
    .format((value) => {
      // Преобразование времени в желаемый часовой пояс (например, 'America/New_York')
      let date;
      if (timeFrame === 'D1') {
        date = moment.utc(value.dataValue).tz('Africa/Abidjan');
      }
      else {
        date = moment.utc(value.dataValue).tz(timeZone);
      }
      let formattedTime = date.format('HH:mm');
      // Возвращаем отформатированное время
      return formattedTime;
    });
  ch.plot(0)
    .yAxis(1)
    .labels()
    .format(function () {
      return this.value.toFixed(1);
    });

  // ch.plot(0).yAxis(0).stroke('rgba(0, 0, 0, 0)');
  // ch.plot(0).yAxis(0).ticks().stroke('rgba(0, 0, 0, 0)');
  // ch.plot(0).yAxis(0).minorTicks().stroke('rgba(0, 0, 0, 0)');
  ch.plot(0).yAxis(1).stroke('rgba(0, 0, 0, 0)');
  ch.plot(0).yAxis(1).ticks().stroke('rgba(0, 0, 0, 0)');
  ch.plot(0).yAxis(1).minorTicks().stroke('rgba(0, 0, 0, 0)');

  ch.plot(0).yGrid().enabled(true).stroke({
    color: '#F0F0F0',
    thickness: 0.2,
  });

  ch.plot(0)
    .xMinorGrid()
    .enabled(true)
    .stroke({
      color: '#F0F0F0',
      thickness: 0.2,
    })
    .drawLastLine(false)
    .drawFirstLine(false);

  // Шаг оси Y

  // Устанавливаем верхний отступ для контейнера графика
  // const chartContainer = document.getElementById('stock-chart');
  // if (chartContainer) {
  //     chartContainer.style.marginTop = '-30px';
  // }
}

function adjustDate(date, timeFrame) {
  const parsedDate = new Date(date);

  switch (timeFrame) {
    case 'M1': {
      parsedDate.setSeconds(0, 0);
      break;
    }
    case 'M5': {
      parsedDate.setMinutes(Math.floor(parsedDate.getMinutes() / 5) * 5);
      parsedDate.setSeconds(0, 0);
      break;
    }
    case 'M15': {
      parsedDate.setMinutes(Math.floor(parsedDate.getMinutes() / 15) * 15);
      parsedDate.setSeconds(0, 0);
      break;
    }
    case 'H1': {
      parsedDate.setMinutes(0, 0, 0);
      break;
    }
    case 'D1': {
      parsedDate.setHours(0, 0, 0, 0);
      break;
    }
    default:
      throw new Error('Неизвестный таймфрейм');
  }

  return parsedDate.toISOString();
}

function pairTrades(trades, timeFrame) {
  // console.log(trades);
  let openTrades = [];
  const pairs = [];
  // console.log(trades);
  if (trades[0]?.name !== undefined) {
    trades.forEach((trade) => {
      const data = [
        {
          timeCandle: adjustDate(
            addHoursToDate(trade.date_buy, dateBias),
            timeFrame
          ),
          price: trade.buy_price,
        },
        {
          timeCandle: adjustDate(
            addHoursToDate(trade.date_close, dateBias),
            timeFrame
          ),
          price: trade.curent_price,
        },
      ];
      pairs.push(data);
    });
  }
  else {
    let valueBuy = 0
    let valueSell = 0
    let sumComission = 0
    let wasEndTrade = false
    trades.forEach((trade) => {
      const {
        currentpos,
        buysell,
        ticker,
        comission,
        value
      } = trade;

      if (wasEndTrade && currentpos !== 0 && openTrades.length >0) {
        pairs.push(openTrades);
        openTrades = []
        valueBuy = 0
        valueSell = 0
        sumComission = 0
        wasEndTrade = false
      }

      sumComission += comission
      if (trade.buysell === 'B') {
        valueBuy += value
      }
      else {
        valueSell += value
      }

      if (openTrades.length && currentpos !== 0) {
        openTrades.push(trade)
      }
      else if (currentpos < 0 && buysell === 'S') {
        openTrades.push({
          ...trade,
          type: 'short'
        });
      }
      else if (currentpos > 0 && buysell === 'B') {
        openTrades.push({
          ...trade,
          type: 'long'
        });
      }
      else if (currentpos === 0) {
        wasEndTrade = true
        if (openTrades.length > 0) {
          openTrades.push(trade)
          for (let trade of openTrades) {
            trade['open'] = openTrades[0].value
            trade['close'] = openTrades[openTrades.length - 1].value
            trade['profit'] = Math.round((valueSell - valueBuy - sumComission) * 100) / 100
            trade['return_percent'] = Math.round((valueSell / valueBuy * 100 - 100) * 100) / 100
          }
        }
      }
      // console.log('openTrades: ', [...openTrades])
      // console.log('pairs: ', [...pairs])
    });
    if (openTrades.length > 0) {
      pairs.push(openTrades);
    }
  }
  // console.log(pairs);

  return pairs;
}

function addHoursToDate(date, hours) {
  const parsedDate = new Date(date);
  parsedDate.setHours(parsedDate.getHours() + hours);
  return parsedDate.toISOString();
}
