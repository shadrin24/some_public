import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import Stack from '@mui/material/Stack';
import { CandlestickChart } from '../TerminalComponent/Chart/candlestick';
import { useFetching } from '../TerminalComponent/hooks/useFetching';
import 123ServerAPI from '../TerminalComponent/API/123ServerAPI';
import 123ServerRealTrades from '../TerminalComponent/API/123ServerRealTrades';
import 123ServerPortfolio from '../TerminalComponent/API/123ServerPortfolio';

import timeFrameListJson from '../TerminalComponent/TimeFrameList.json';
import MetricsBlock from './MetricsBlock/MetricsBlock';
import TickerBlock from './TickerBlock/TickerBlock';
import TimeZone from '../TerminalComponent/common/TimeZone';
import MetricsBar from './ChooseAccountsBar/MetricsBar';
import 123HiddenTrades from '../TerminalComponent/API/123ServerHiddenTrades';
import jwtAxios from '@crema/services/auth/JWT';
import { useAuthUser } from '@crema/hooks/AuthHooks';
import { useAuthMethod } from '@crema/hooks/AuthHooks';
import { makeStyles } from "@mui/styles";

// Тайм фрейм
const timeFrameList = timeFrameListJson.timeFrameList;

const BoxCenter = ({ children, ...params }) => {
  return (
    <Box
      display="flex"
      width="100%"
      justifyContent="center"
      alignItems="center"
      flexGrow={1}
      {...params}
    >
      {children}
    </Box>
  );
};

const DashboardCommon = () => {

  // Создаем глобальные стили для Paper
  const useGlobalStyles = makeStyles({
    '@global': {
      // Стили для скроллбара
      '::-webkit-scrollbar': {
        width: '5px',
        height: '5px',
      },
      '::-webkit-scrollbar-track': {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
      },
      '::-webkit-scrollbar-thumb': {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: '1px',
      },

      // '.MuiPaper-root': {
      //   backgroundImage: 'none'
      // },
      '.MuiDialog-paper': {
        backgroundImage: 'none'
      },
      // MuiDialog-paper
      '.MuiAccordion-root': {
        backgroundImage: 'none'
      },
      '.MuiAccordion-root.Mui-expanded': {
        margin: '0px',
        minHeight: '0px',
      },
      '.MuiAccordionSummary-root': {
        minHeight: '30px',
        margin: '0px',
      },
      '.MuiAccordionSummary-root.Mui-expanded': {
        minHeight: '30px',
        margin: '0px',
      },
      '.MuiAccordionSummary-content': {
        minHeight: '0px',
        margin: '0px',
      },
      '.MuiAccordionSummary-content.Mui-expanded': {
        margin: '0px',
        minHeight: '0px',
      },
      '.MuiAccordionDetails-root': {
        padding: '2px 8px'
      },
      '.MuiTooltip-tooltip': {
        backgroundColor: 'rgba(19,53,73,1)',
        borderWidth: '1px',      // Толщина границы
        borderStyle: 'solid',    // Стиль границы
        borderColor: 'rgba(136,136,136,0.8)', // Цвет границы
        maxWidth: '70vw',
      },

    },
  });
  useGlobalStyles()

  // Список токенов
  const [tokensList, setTokensList] = useState();
  // Выбранный токен
  const [token, setToken] = useState('');
  // Список юнионов
  const [allAccountsInTrades, setAllAccountsInTrades] = useState([]);
  // Выбранный список счетов
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  // Выбранный список счетов
  const [selectedAccount, setSelectedAccount] = useState('');
  // Все сделки и заявки
  const [metrics, setMetrics] = useState({});
  const [portfolioMetrics, setPortfolioMetrics] = useState({});
  const [longMetrics, setLongMetrics] = useState({});
  const [shortMetrics, setShortMetrics] = useState({});

  const [selectedTicker, setSelectedTicker] = useState('');
  const [tradesByTicker, setTradesByTicker] = useState([]);
  const [allTickersFromBroker, setAllTickersFromBroker] = useState([]);
  // Таймфрейм
  const [timeFrame, setTimeFrame] = useState(timeFrameList[3].label);
  const [timeZone, setTimeZone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone
  ); // Иркутск
  // Имена для аккаунтов
  const [renameList, setRenameList] = useState({});

  // Тип списка счетов (реальные или скрытые сделки)
  const [accountsType, setAccountsType] = React.useState('real');

  const { user } = useAuthUser();
  const { getAccess } = useAuthMethod();

  // Диапазон дат (инициализируем период за последний месяц)
  const [datesRange, setDatesRange] = useState(() => {
    const to = new Date();
    const from = new Date(to);
    from.setMonth(from.getMonth() - 1);
    from.setHours(0, 0, 0, 0);
    return { from: from, to: to };
  });

  // Получить список токенов (выбираем первый просто для обращения к API finam)
  const [fetchTokens, isTokensLoading, tokensDataLoad, tokensError] =
    useFetching(async () => {
      const response = await 123.getListTokens();
      // console.log("token response       !!!");
      // console.log(response);
      setTokensList(response);
      setToken(response[0]);
    });

  // Получить список счетов
  const [fetchAccounts, isAccountsLoading, accountsDataLoad, accountsError] =
    useFetching(async (_unions) => {
      let response;
      if (['admin', 'risk_manager', 'technician'].includes(user.role)) {
        if (accountsType === 'real') {
          response = await 123ServerRealTrades.getAllTradesUnions();
        } else if (accountsType === 'hidden') {
          response = await 123ServerHiddenTrades.getHiddenTradesNames();
        }
      } else {
        response = await getAccess();
        response = response.data;
        if (response === null) {
          response = [];
        } else {
          response =
            response?.[accountsType] !== undefined
              ? response?.[accountsType]
              : [];
        }
      }
      // console.log([response[0]]);
      setAllAccountsInTrades(response);
      // console.log(response);
      // setSelectedAccounts([response[0]])
      setSelectedAccount(response[0]);
    });

  // Получить список всех тикеров на площадке брокера
  const [
    fetchAllTickersFromBroker,
    isAllTickersFromBrokerLoading,
    allTickersFromBrokerLoad,
    allTickersFromBrokerError,
  ] = useFetching(async (_union, _ticker) => {
    const response = await 123ServerAPI.getAllTickers();
    setAllTickersFromBroker(response);
  });

  // Запрос токенов и всех тикеров
  useEffect(() => {
    fetchTokens();
    fetchAllTickersFromBroker();
    // 123ServerRealTrades.getAllTrades()
    // 123ServerRealTrades.deleteTradesBeforeDate('677477RFWBJ', '2024-10-01')
    // 123ServerRealTrades.uploadTradesFromJSON()
    // 123ServerRealTrades.updateCurrentposByID(5322, 0)
    // 123ServerRealTrades.updateCurrentposByID(5323, 0)
    // 123ServerRealTrades.updateCurrentposByID(5324, 0)
    // 123ServerRealTrades.deleteTradeByID(5250)
    123ServerPortfolio.getAllPortfolio()
    123ServerHiddenTrades.getAllHiddenTrades()

    // Получаем список имен аккаунтов
    jwtAxios
      .get(
        'https://api.123.123/api/getcustomdata?name=tech_data:listAccName'
      )
      .then((json) => {
        setRenameList(json['data']);
        // console.log(json['data']);
      })
      .catch((e) => {
        console.log('ERROR: ' + e);
      });
  }, []);

  // Запрос токенов и счетов
  useEffect(() => {
    fetchAccounts();
  }, [accountsType]);

  // Запрос сделок и метрик за период
  // useEffect(() => {
  //     if (selectedUnionsList.length) {
  //         fetchTradesAndMetrics(selectedUnionsList, "2024-05-28T13:21:03Z", "2024-05-31T14:31:10Z")
  //         //    "2024-05-28 13:21:03", "2024-05-31 14:31:10"
  //     }
  // }, [selectedUnionsList]);

  // const handleSetSelectedTicker = (event, ticker) => {
  //     console.log(ticker);
  //
  //     setSelectedTicker(ticker)
  // }

  // const handleSetSelectedUnion = (event, union) => {
  //     setSelectedUnion(union)
  // }

  return (
    <Stack
      display="flex"
      flexDirection="column"
      height="calc(100%-1px)"
      bottom={0}
      left={0}
      right={0}
      top={1}
      position="absolute"
    >
      <Stack
        display="flex"
        flexDirection="row"
        flexGrow={1}
        borderBottom="1px solid grey"
      >
        <BoxCenter width={0.5} maxWidth={400} borderRight="1px solid grey">
          <MetricsBar
            selectedAccount={selectedAccount}
            selectedAccounts={selectedAccounts}
            setSelectedAccounts={setSelectedAccounts}
            allAccountsInTrades={allAccountsInTrades}
            setAllAccountsInTrades={setAllAccountsInTrades}
            datesRange={datesRange}
            setDatesRange={setDatesRange}
            metrics={metrics}
            setMetrics={setMetrics}
            portfolioMetrics={portfolioMetrics}
            setPortfolioMetrics={setPortfolioMetrics}
            longMetrics={longMetrics}
            setLongMetrics={setLongMetrics}
            shortMetrics={shortMetrics}
            setShortMetrics={setShortMetrics}
            accountsType={accountsType}
            setAccountsType={setAccountsType}
            timeZone={timeZone}
            renameList={renameList}
            setRenameList={setRenameList}
          />
        </BoxCenter>
        <BoxCenter position={'relative'}>
          <TickerBlock
            selectedAccount={selectedAccount}
            setSelectedAccount={setSelectedAccount}
            selectedTicker={selectedTicker}
            setSelectedTicker={setSelectedTicker}
            allAccountsInTrades={allAccountsInTrades}
            timeFrameList={timeFrameList}
            timeFrame={timeFrame}
            setTimeFrame={setTimeFrame}
            allTickersFromBroker={allTickersFromBroker}
            setTradesByTicker={setTradesByTicker}
            accountsType={accountsType}
            renameList={renameList}
          />
          <CandlestickChart
            setTriggerBuySell={''}
            buySellTrigger={''}
            token={token === undefined ? '' : token.token}
            timeFrame={timeFrame}
            ticker={[selectedTicker]}
            trades={tradesByTicker}
            timeZone={timeZone}
            requestFrom={accountsType === 'real' ? 'Finam' : 'TV'}
            selectedAccount={selectedAccount}
          />
          <TimeZone setTimeZone={setTimeZone} />
        </BoxCenter>
      </Stack>
    </Stack>
  );
};

export default DashboardCommon;
