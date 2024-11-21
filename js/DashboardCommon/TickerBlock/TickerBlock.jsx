import React, {
  useEffect,
  useState
} from 'react';
import {
  Box,
  Divider,
  Tooltip
} from '@mui/material';
import Stack from '@mui/material/Stack';
import AutocompleteChart from '../../TerminalComponent/common/AutocompleteChart';
import { useFetching } from '../../TerminalComponent/hooks/useFetching';
import 123 from '../../TerminalComponent/API/123';
import 123 from '../../TerminalComponent/API/123';
import styles from './Styles.module.css';
import { useThemeContext } from '@crema/context/ThemeContextProvider';

const TickerBlock = ({
  selectedAccount,
  setSelectedAccount,
  selectedTicker,
  setSelectedTicker,
  allAccountsInTrades,
  timeFrameList,
  timeFrame,
  setTimeFrame,
  allTickersFromBroker,
  setTradesByTicker,
  accountsType,
  renameList,
}) => {
  const { theme } = useThemeContext();
  const [tickersListInTrades, setTickersListInTrades] = useState([]);

  const handleSetSelectedUnion = (event, account) => {
    setSelectedAccount(account);
  };
  const handleSetSelectedTicker = (event, ticker) => {
    // console.log(ticker);
    setSelectedTicker(ticker);
  };

  // Получить список тикеров участвовавших в сделках
  const [
    fetchTradesTickers,
    isTradesTickersLoading,
    tradesTickersLoad,
    tradesTickersError,
  ] = useFetching(async(_account) => {
    let tickers;
    // Новый список для хранения результатов
    let newTickersList = [];
    if (accountsType === 'real') {
      tickers = await 123.getTradesTickersWithCounts(
        _account
      );
      // console.log(tickers);
      // Проходим по каждому тикеру
      // tickers.forEach((ticker) => {
      //     const [board, code] = ticker.split('/');
      //     // Проверяем каждый словарь в списке items
      //     allTickersFromBroker.forEach((item) => {
      //         if (item.board === board && item.code === code) {
      //             newTickersList.push(item);
      //         }
      //     });
      // });
      // console.log(tickers);
      Object.entries(tickers).forEach(([ticker, count]) => {
        const [board, code] = ticker.split('/');

        // Проверяем наличие совпадения в `allTickersFromBroker`
        allTickersFromBroker.forEach((item) => {
          if (item.board === board && item.code === code) {
            // Добавляем в массив совпадающий тикер с количеством записей
            newTickersList.push({ ...item, countTrades: count });
          }
        });
      });
      // Сортируем newTickersList по полю count в порядке убывания
      newTickersList.sort((a, b) => b.countTrades - a.countTrades);

    }
    else if (accountsType === 'hidden') {
      tickers = await 23.getSharesByHiddenTradeName(
        _account
      );
      // console.log(tickers);
      // Присвоить board всем тикерам
      let board = '';
      switch (_account.split('_')[0]) {
        case 'ESP':
          board = 'BME:';
          break;
        case 'AMER':
          board = 'NYSE:';
          break;
        case 'GER':
          board = 'XETR:';
          break;
        case 'IND':
          board = 'NSE:';
          break;
        case 'JPN':
          board = 'TSE:';
          break;
        // case 'GK':
        //     board = 'HKEX:'
        //     break;
      }
      // const someBoards = ['AMER_HIDDEN']
      // if (someBoards.includes(_account)) board = ''
      // switch (_account.split('_')[1]) {
      //     case 'F':
      //         board = 'FUT:';
      //         break;
      // }
      tickers.forEach((code) => {
        // Если board уже есть в названии тикера
        if (code.split(':')[1]) {
          newTickersList.push({ code: code, market: 'MARKET_STOCK' });
        }
        // Если board нет в названии тикера
        else {
          newTickersList.push({ code: board + code, market: 'MARKET_STOCK' });
        }
      });
    }

    // console.log(tickers);
    // console.log(newTickersList);
    setTickersListInTrades(newTickersList);
    setSelectedTicker(newTickersList[0]);
  });
  // Получить список заявок и сделок
  const [
    fetchTradesByUnionTicker,
    isTradesByUnionTickerLoading,
    tradesByUnionTickerLoad,
    tradesByUnionTickerError,
  ] = useFetching(async(_account, _ticker) => {
    let _trades_by_ticker;
    if (accountsType === 'real') {
      _trades_by_ticker = await 123.getTradesByTickerUnion(
        _account,
        _ticker,
      );
      // console.log(_trades_by_ticker);
    }
    else if (accountsType === 'hidden') {
      let new_trades = [];
      _trades_by_ticker =
        await 123.getHiddenTradesByNameShares(
          _account,
          _ticker
        );

      _trades_by_ticker.forEach((trade) => {

        // Конвертируем время с Иркутского
        const ftrade = { ...trade };
        // console.log(ftrade);
        // Преобразуем строку в объект Date
        trade.date_buy = new Date(trade.date_buy);
        // Отнимаем 7 часов
        trade.date_buy.setHours(trade.date_buy.getHours() - 8);
        // Преобразуем объект Date обратно в строку
        trade.date_buy = trade.date_buy
          .toISOString()
          .replace('T', ' ')
          .slice(0, 19);
        // Преобразуем строку в объект Date
        trade.date_close = new Date(trade.date_close);
        // Отнимаем 7 часов
        trade.date_close.setHours(trade.date_close.getHours() - 8);
        // Преобразуем объект Date обратно в строку
        trade.date_close = trade.date_close
          .toISOString()
          .replace('T', ' ')
          .slice(0, 19);
        // console.log(trade);

        // Делим скрытые сделки на покупку и продажу
        const [date_buy, time_buy] = trade.date_buy.split(' ');
        const [date_close, time_close] = trade.date_close.split(' ');
        // Создание новой строки в формате ISO
        const dateOpen = `${date_buy}T${time_buy}.000Z`;
        const dateClose = `${date_close}T${time_close}.000Z`;

        new_trades.push({
          ...trade,
          cur_time_open: dateOpen,
          cur_time_close: dateClose,
          time: dateOpen,
          buysell: trade.direction === 'LONG' ? 'B' : 'S',
          price: trade.buy_price,
          value: trade.lot_bought,
        });
      });
      _trades_by_ticker = new_trades;
    }
    // console.log(_trades_by_ticker);
    setTradesByTicker(_trades_by_ticker);
  });

  // Запрос списка тикеров из таблицы сделок по счету
  useEffect(() => {
    if (selectedAccount && allTickersFromBroker.length) {
      fetchTradesTickers(selectedAccount);
    }
  }, [selectedAccount, allTickersFromBroker]);

  // Запрос сделок по тикеру и счету
  useEffect(() => {
    if (selectedTicker) {
      let strBoardTicker = selectedTicker.code;
      if (accountsType === 'real') {
        strBoardTicker = selectedTicker.board + '/' + selectedTicker.code;
      }
      else if (accountsType === 'hidden') {
        if (selectedTicker.code.split(':')[1]) {
          // Тикеры с которых надо убрать приставку
          const listSomeTickers = ['XETR', 'NSE', 'BME', 'TSE']
          if (listSomeTickers.includes(selectedTicker.code.split(':')[0])) {
            strBoardTicker = selectedTicker.code.split(':')[1];
          }
          const listSomeBoards = ['AMER_HIDDEN']
          // console.log(selectedAccount);
          if (listSomeBoards.includes(selectedAccount) && selectedTicker.code.split(':')[0] === "NYSE")
            strBoardTicker = selectedTicker.code.split(':')[1]
        }
      }
      // console.log(selectedAccount, strBoardTicker);
      fetchTradesByUnionTicker(selectedAccount, strBoardTicker);
    }
  }, [selectedTicker]);

  // console.log(renameList);
  return (
    <Box
      position={'absolute'}
      top={'55px'}
      left={'60px'}
      zIndex={1}
      borderRadius="5px"
      border="1px solid rgb(86,103,112)"
      className={
        theme.palette.mode === 'dark' ? styles.boxDark : styles.boxLight
      }
      bgcolor={theme.palette.background.paper}
      // sx={{
      //     // bgcolor: "rgba(31,37,40, 0.7)",
      //     // borderColor: "rgb(86,103,112)",
      //     // border: "1 px solid red"
      // }}
    >
      <Stack direction="row" columnGap="5px">
        {Object.keys(renameList).length &&
         <AutocompleteChart
           placeholder="Union"
           value={selectedAccount}
           options={allAccountsInTrades.length ? allAccountsInTrades : ['']}
           getOptionLabel={(option) => {
             // console.log(option, renameList[option]);
             if (renameList[option] !== undefined)
               return renameList[option]?.name;
             else if (option.length) return option;
             else return '';
             // option.name + ' : ' + option.account_number
           }}
           renderOption={(props, option) => (
             <li {...props}>
               <Tooltip
                 title={renameList[option]?.original || ''}
                 placement="right"
               >
                 <span>{renameList[option]?.name || option}</span>
               </Tooltip>
             </li>
           )}
           onChange={handleSetSelectedUnion}
           width={'250px'}
         />}
        {!Object.keys(renameList).length &&
         <AutocompleteChart
           placeholder="Union"
           value={selectedAccount}
           options={allAccountsInTrades.length ? allAccountsInTrades : ['']}
           getOptionLabel={(option) => option || ''}
           renderOption={(props, option) => (
             <li {...props}>
               <Tooltip
                 title={renameList[option]?.original || ''}
                 placement="right"
               >
                 <span>{renameList[option]?.name || option}</span>
               </Tooltip>
             </li>
           )}
           onChange={handleSetSelectedUnion}
           width={'250px'}
         />}
        <Divider
          orientation="vertical"
          flexItem
          sx={{ borderColor: 'rgb(86,103,112)' }}
        />
        <AutocompleteChart
          placeholder="Ticker"
          // value={tickerFromPositions ? tickerFromPositions : ''} /*Если есть позиции - подставить первую*/
          value={selectedTicker} /*Если есть позиции - подставить первую*/
          options={tickersListInTrades.length ? tickersListInTrades : ['']}
          getOptionLabel={(option) => option.code || ''} // Указываем основной текст, если нужен
          renderOption={(props, option) => (
            <div {...props} style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span>
                {option.code && option.shortName ? `${option.code} : ${option.shortName}` : option.code}
            </span>
              {option.countTrades && (
                <span style={{ marginLeft: 'auto', color: '#888' }}>
                    ({option.countTrades})
                </span>
              )}
            </div>
          )}
          onChange={handleSetSelectedTicker}
          width="350px"
        />
        <Divider
          orientation="vertical"
          flexItem
          sx={{ borderColor: 'rgb(86,103,112)' }}
        />
        {/*Таймфрейм*/}
        <AutocompleteChart
          placeholder="Time Frame"
          options={timeFrameList}
          value={timeFrame}
          width="60px"
          onChange={(e, time) => {
            setTimeFrame(time.label);
          }}
        />
      </Stack>
    </Box>
  );
};

export default TickerBlock;
