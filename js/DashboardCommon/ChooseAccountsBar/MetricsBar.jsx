import React, {
  useEffect,
  useState
} from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import GraphsBlock from '../GraphsBlock/GraphsBlock';
import ChooseAccountsBlock from './ChooseAccountsBlock';
import { useFetching } from '../../TerminalComponent/hooks/useFetching';
import 123GRPC from '../../TerminalComponent/API/132ServerGRPC';
import 123HiddenTrades from '../../TerminalComponent/API/123HiddenTrades';
import 123RealTrades from '../../TerminalComponent/API/123rRealTrades';
import MetricsBlock from '../MetricsBlock/MetricsBlock';
import CircularProgress from '@mui/material/CircularProgress';
import { useThemeContext } from '@crema/context/ThemeContextProvider';
import { useAuthUser } from '@crema/hooks/AuthHooks';
import { useAuthMethod } from '@crema/hooks/AuthHooks';
import styles from './Styles.module.css';
import Tooltip from "@mui/material/Tooltip";

const MetricsBar = ({
  selectedAccount,
  selectedAccounts,
  setSelectedAccounts,
  allAccountsInTrades,
  datesRange,
  setDatesRange,
  metrics,
  setMetrics,
  portfolioMetrics,
  setPortfolioMetrics,
  longMetrics,
  setLongMetrics,
  shortMetrics,
  setShortMetrics,
  accountsType,
  setAccountsType,
  timeZone,
  renameList,
  setRenameList,
}) => {
  // console.log(portfolioMetrics);
  const { theme } = useThemeContext();
  const { user } = useAuthUser();
  const { getAccess } = useAuthMethod();
  // console.log(metrics);
  // console.log(datesRange);
  const [needCheckTimeFrom, setNeedCheckTimeFrom] = useState(false);
  const [needCheckTimeTo, setNeedCheckTimeTo] = useState(false);
  // Открытие окна таблицы метрик
  const [openMetricsBlock, setOpenMetricsBlock] = useState(false);
  // Открытие окна графиков метрик
  const [openGraphsBlock, setOpenGraphsBlock] = useState(false);
  const [accessForTabl, setAccessForTabl] = useState(['real', 'hidden']);


  useEffect(() => {
    if (!['admin', 'risk_manager', 'technician'].includes(user.role)) {
      getAccess().then((data) => {
        const filterData = Object.keys(data?.data).filter((item) => {
          if (data?.data[item].length > 0) {
            return item;
          }
        });
        setAccessForTabl(filterData);
      });
    }
  }, []);

  function arrayForTable(arr, n) {
    let result = [];
    let rowData = [];
    let lenArr = arr.length;
    for (let element_count = 0; element_count < n; element_count += 1) {
      // Добавляем элементы с шагом n, начиная с первого элемента
      for (let i = element_count; i < lenArr; i += n) {
        rowData.push({ value: arr[i].text });
        rowData.push({ value: Math.round(arr[i].count * 100) / 100, tooltip: arr[i].tooltip });
      }
      result.push(rowData);
      rowData = [];
    }
    return result;
  }

  // функция округления ключей, если ключ float
  // function roundFloatsInObject(obj) {
  //   for (let key in obj) {
  //     if (typeof obj[key] === 'number' && !Number.isInteger(obj[key])) {
  //       obj[key] = parseFloat(obj[key].toFixed(2));
  //     }
  //     //Если ключ - словарь, то округляем его ключи тоже
  //     else if (typeof obj[key] === 'object') {
  //       for (let second_key in obj[key]) {
  //         if (
  //           typeof obj[key][second_key] === 'number' &&
  //           !Number.isInteger(obj[key][second_key])
  //         ) {
  //           obj[key][second_key] = parseFloat(obj[key][second_key].toFixed(2));
  //         }
  //       }
  //     }
  //   }
  //   return obj;
  // }

  let chunkedMetrics = [];
  if (metrics) {
    // console.log(metrics);
    const displayedMetrics = [
      { text: 'Return (%)', count: metrics?.return, tooltip: '(sell_value_total / (buy_value_total + comission_total)) * 100 - 100' },
      { text: 'Annual Return (%)', count: metrics?.annual_return, tooltip: 'Return (%) / total_days * 365' },
      { text: '% Profitable', count: metrics?.profit_trades_percent, tooltip: 'Кол-во положительных сделок / Кол-во закрытых сделок * 100' },
      { text: 'Profit Factor', count: metrics?.profit_factor, tooltip: 'sell_value_total - buy_value_total - comission_total' },
      { text: 'Max DD (в %)', count: metrics?.max_cum_drawdawn_percent, tooltip: 'Минимальное значение drawdawn в %' },
      { text: 'Recovery Factor', count: metrics?.cum_recovery_factor, tooltip: 'Return (%) / Max DrawDown (%)' },

      // {text: 'Return', count: metrics.return},
      // {text: 'Recovery factor annual', count: metrics.recovery_factor_annual_metric},
      // {text: 'Max DD (в днях)', count: metrics.max_drawdown_timedelta},
      // {text: 'Полных сделок', count: metrics.full_trades_count},
      // {text: 'Дней торговли на счете ', count: metrics.days_count},
      // {text: 'Лонговых сделок', count: metrics.long_trades_count},
      // {text: 'Шортовых сделок', count: metrics.short_trades_count},
      // {text: 'Средняя прибыльная сделка', count: metrics.average_profit_trade},
      // {text: 'Cредняя убыточная сделка ', count: metrics.average_loose_trade},
      // {text: 'Max положительная серия сделок', count: metrics.maximum_positive_series_of_trades},
      // {text: 'Max отрицательная серия сделок', count: metrics.maximum_negative_series_of_trades},
      // {text: 'Среднее время в сделке', count: metrics.average_days_in_trade},
    ];
    chunkedMetrics = arrayForTable(displayedMetrics, 6);
    // console.log(chunkedMetrics);
  }

  const dateWithoutTime = (date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const isDatesSame = (dateTime1, dateTime2) => {
    return (
      dateTime1.getFullYear() === dateTime2.getFullYear() &&
      dateTime1.getDate() === dateTime2.getDate() &&
      dateTime1.getDay() === dateTime2.getDay()
    );
  };

  const handleSetDateFrom = (date) => {
    if (isDatesSame(date, datesRange.to)) setNeedCheckTimeFrom(true);
    else setNeedCheckTimeFrom(false);
    setDatesRange((prevState) => ({ ...prevState, from: date }));
  };

  const handleSetDateTo = (date) => {
    if (isDatesSame(date, datesRange.from)) setNeedCheckTimeTo(true);
    else setNeedCheckTimeTo(false);
    setDatesRange((prevState) => ({ ...prevState, to: date }));
    // console.log(date);
  };

  const checkDisableDateFrom = (date) =>
    dateWithoutTime(date) > dateWithoutTime(datesRange.to);

  const checkDisableTimeFrom = (timeValue, view) => {
    if (needCheckTimeFrom) {
      if (view === 'hours') {
        return timeValue >= datesRange.to.getHours();
      }
    }
    return false;
  };

  const checkDisableDateTo = (date) =>
    dateWithoutTime(date) < dateWithoutTime(datesRange.from);

  const checkDisableTimeTo = (timeValue, view) => {
    if (needCheckTimeTo) {
      if (view === 'hours') {
        return timeValue <= datesRange.from.getHours();
      }
    }
    return false;
  };

  const onClickFetchMetrics = () => {
    // console.log(datesRange);
    fetchMetrics(selectedAccounts, datesRange.from, datesRange.to);
  };

  const onClickFetchFullPeriodMetrics = () => {
    fetchMetrics(selectedAccounts);
    // console.log(datesRange.from, datesRange.to);
  };

  // Получить список заявок и сделок из реальных счетов
  const [fetchMetrics, isMetricsLoading, metricsDataLoad, metricsError] =
    useFetching(async(_unions, startTime, endTime) => {
      let fullPeriod = false;
      if (!startTime && !endTime) {
        startTime = new Date(2020, 0, 1);
        endTime = new Date();
        fullPeriod = true;
      }
      setMetrics({});
      setPortfolioMetrics({});
      setLongMetrics({});
      setShortMetrics({});
      let response;
      if (accountsType === 'real') {
        // console.log(startTime, endTime)
        response =
          await 123ServerRealTrades.getTradesMetricsByUnionsAndTimes(
            _unions,
            startTime,
            endTime
          );
      }
      else if (accountsType === 'hidden') {
        response =
          await 123ServerHiddenTrades.getTradesMetricsByNamesHiddenTradesAndTimes(
            _unions,
            startTime,
            endTime
          );
      }
      console.log(response);
      // console.log(startTime, endTime)
      if (fullPeriod) {
        const allTrades = response?.metrics_full?.all_trades[3];
        const periodStart = new Date(allTrades[0].time);
        const periodEnd = new Date(allTrades[allTrades.length - 1].time);
        setDatesRange({
          from: periodStart,
          to: periodEnd,
        });

        // console.log(allTrades[0].time, allTrades[allTrades.length - 1].time,);
        // console.log(periodStart, periodEnd);
      }
      // else if (accountsType === 'hidden') {
      //   response =
      //     await 123ServerHiddenTrades.getTradesMetricsByNamesHiddenTradesAndTimes(
      //       _unions,
      //       startTime,
      //       endTime
      //     );
      //   console.log(response);
      //   if (fullPeriod) {
      //     const allTrades = response?.trades_and_metrics?.all_trades[3];
      //     const periodStart = new Date(allTrades[0].time);
      //     const periodEnd = new Date(allTrades[allTrades.length - 1].time);
      //     setDatesRange({
      //       from: periodStart,
      //       to: periodEnd,
      //     });
      //   }
      // }

      // console.log(response);
      let responseMetrics = response?.metrics_full;
      let responsePortfolioMetrics = response?.portfolio_metrics || {};

      let responseLongMetrics = response?.metrics_long;
      let responseShortMetrics = response?.metrics_short;
      // console.log(response);
      setMetrics(responseMetrics);
      setPortfolioMetrics(responsePortfolioMetrics);
      setLongMetrics(responseLongMetrics);
      setShortMetrics(responseShortMetrics);

    });

  // Получить список заявок и сделок из скрытых сделок
  // const [fetchHiddenTradesAndMetrics, isHiddenTradesAndMetricsLoading, hiddenTradesAndMetricsDataLoad, hiddenTradesAndMetricsError] = useFetching(async (_names, startTime, endTime) => {
  //     let response = await 123ServerHiddenTrades.getTradesMetricsByNamesHiddenTradesAndTimes(_names, startTime, endTime)
  //     response = roundFloatsInObject(response)
  //     // console.log(typeof response);
  //     setMetrics(response)
  // })

  useEffect(() => {
    if (selectedAccount !== undefined && selectedAccount.length > 0) {
      setSelectedAccounts([selectedAccount]);
      fetchMetrics([selectedAccount]); // метрики по всем сделкам с 1.01.2020
    }
  }, [selectedAccount]);

  // console.log(metrics);
  return (
    <Box height={'100%'} width={'100%'}>
      <Stack
        direction={'column'}
        rowGap="10px"
        width={'100%'}
        alignItems={'center'}
      >
        <Stack direction="column" rowGap="10px" width={'90%'}>
          <Tabs
            value={accountsType}
            onChange={(event, newValue) => setAccountsType(newValue)}
            sx={{
              width: '100%',
            }}
          >
            <Tab
              label="Real Accounts"
              value="real"
              sx={{
                width: '50%',
              }}
            />
            {accessForTabl.includes('hidden') ? (
              <Tab
                label="Hidden Trades"
                value="hidden"
                sx={{
                  width: '50%',
                }}
              />
            ) : null}
          </Tabs>
          <Box height="300px">
            {allAccountsInTrades && (
              <ChooseAccountsBlock
                allAccountsInTrades={allAccountsInTrades}
                selectedAccounts={selectedAccounts}
                setSelectedAccounts={setSelectedAccounts}
                accountsType={accountsType}
                renameList={renameList}
                setRenameList={setRenameList}
              />
            )}
          </Box>

          <DateTimePicker
            label="From"
            inputFormat="dd.MM.yyyy HH:mm"
            value={datesRange.from}
            onChange={handleSetDateFrom}
            shouldDisableDate={checkDisableDateFrom}
            shouldDisableTime={checkDisableTimeFrom}
            renderInput={(props) => <TextField {...props} />}
          />
          <DateTimePicker
            label="To"
            inputFormat="dd.MM.yyyy HH:mm"
            value={datesRange.to}
            onChange={handleSetDateTo}
            shouldDisableDate={checkDisableDateTo}
            shouldDisableTime={checkDisableTimeTo}
            renderInput={(props) => <TextField {...props} />}
          />
          <Box
            sx={{
              height: '100px',
              width: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              display: 'flex',
            }}
          >
            {isMetricsLoading ? (
              <CircularProgress size={30} sx={{ color: 'grey' }}/>
            ) : (
              <Box
                flexDirection={'column'}
                display={'flex'}
                width={'100%'}
                height={'100%'}
                justifyContent={'space-between'}
              >
                <Box height={'45px'}>
                  <Button
                    className={
                      theme.palette.mode === 'dark'
                        ? styles.btnDark
                        : styles.btnLight
                    }
                    variant="contained"
                    onClick={onClickFetchMetrics}
                  >
                    <Typography fontSize={'20px'}>Calculate</Typography>
                  </Button>
                </Box>
                <Box height={'45px'}>
                  <Button
                    className={
                      theme.palette.mode === 'dark'
                        ? styles.btnDark
                        : styles.btnLight
                    }
                    variant="contained"
                    onClick={onClickFetchFullPeriodMetrics}
                  >
                    <Typography fontSize={'20px'}>
                      Calculate all-time
                    </Typography>
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
          <Stack
            minHeight={'45px'}
            height="100%"
            width="100%"
            direction={'row'}
            columnGap={'5px'}
          >
            <Box width={'50%'} height={'100%'}>
              {metrics?.cum_equity_list?.length > 0 && (
                <Box height={'45px'}>
                  <Button
                    className={
                      theme.palette.mode === 'dark'
                        ? styles.btnDark
                        : styles.btnLight
                    }
                    variant="contained"
                    onClick={() => setOpenGraphsBlock(true)}
                  >
                    <Typography fontSize={'15px'}>
                      Show Graphs Metrics
                    </Typography>
                  </Button>
                </Box>
              )}
            </Box>
            <Box width={'50%'}>
              {metrics?.trades_full && (
                <Box height={'45px'}>
                  <Button
                    className={
                      theme.palette.mode === 'dark'
                        ? styles.btnDark
                        : styles.btnLight
                    }
                    variant="contained"
                    onClick={() => setOpenMetricsBlock(true)}
                  >
                    <Typography fontSize={'15px'}>
                      Show Table Metrics
                    </Typography>
                  </Button>
                </Box>
              )}
            </Box>
          </Stack>
        </Stack>
        {metrics?.return && (
          <Box height="100%" width="100%">
            <Stack p="0px" height="100%" width="100%" direction={'row'}>
              <Box width={'50%'} alignItems={'center'}>
                <Table width={'100%'}>
                  <TableBody width={'100%'}>
                    {chunkedMetrics.map((rowData, rowIndex) => {
                      if (rowIndex < 3) {
                        return (
                          <RowMetric
                            key={`rowMetric${rowIndex}`}
                            rowIndex={rowIndex}
                            rowData={rowData}
                            borderRight={'1px solid gray'}
                          />
                        );
                      }
                    })}
                  </TableBody>
                </Table>
              </Box>
              <Box width={'50%'} alignItems={'center'}>
                <Table sx={{ width: '100%' }}>
                  <TableBody>
                    {chunkedMetrics.map((rowData, rowIndex) => {
                      if (rowIndex >= 3) {
                        return (
                          <RowMetric
                            key={`rowMetric${rowIndex}`}
                            rowIndex={rowIndex}
                            rowData={rowData}
                            borderRight={'none'}
                          />
                        );
                      }
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Stack>
            {portfolioMetrics?.percentage_of_capital_at_work &&
             <Box
               width={'100%'}
               height={'41px'}
               borderBottom={'1px solid grey'}
               display={'flex'}
               alignItems={'center'}
               justifyContent={'center'}
             >
               <Table sx={{ width: '100%' }}>
                 <TableBody>
                   <RowMetric
                     rowIndex={0}
                     rowData={
                       [
                         { value: 'Percentage of capital at work (pcw)' },
                         { value: portfolioMetrics?.percentage_of_capital_at_work, tooltip: '(Конечное equity - конечный баланс) / Начальное equity * 100' },
                       ]
                     }
                   />
                 </TableBody>
               </Table>
             </Box>
            }

          </Box>
        )}
      </Stack>
      <MetricsBlock
        metrics={metrics}
        longMetrics={longMetrics}
        shortMetrics={shortMetrics}
        openMetricsBlock={openMetricsBlock}
        setOpenMetricsBlock={setOpenMetricsBlock}
      />
      <GraphsBlock
        metrics={metrics}
        portfolioMetrics={portfolioMetrics}
        openGraphsBlock={openGraphsBlock}
        setOpenGraphsBlock={setOpenGraphsBlock}
        timeZone={timeZone}
      />
    </Box>
  );
};

const RowMetric = ({ rowIndex, rowData, borderRight }) => {
  console.log(rowData);
  const { theme } = useThemeContext();

  const formatNumberWithSpaces = (number) => {
    return number.toString().split('').reverse().join('')
      .replace(/(\d{3})(?=\d)/g, '$1 ')
      .split('').reverse().join('');
  };
  return (
    <TableRow key={rowIndex} sx={{ width: '100%', height: '41px' }}>
      {rowData.map((cellData, index) => {
        const textClassName = `${
          index % 2 === 0 ? 'metricText' : 'metricCount'
        }${theme.palette.mode === 'dark' ? 'Dark' : 'Light'}`;
        // console.log(cellData);
        return (
          <TableCell
            key={index}
            sx={{
              borderRight: index === 1 ? borderRight : 'none',
              // borderBottom: (rowIndex !== 2 && rowIndex !== 5) ? '1px solid gray' : 'none',
              borderBottom: '1px solid gray',
              borderTop:
                rowIndex === 0 || rowIndex === 3 ? '1px solid gray' : 'none',
              p: 2,
              width: '100%',
              minWidth: '50px',
              maxWidth: index % 2 === 0 ? '1px' : '',
            }}
            align={index % 2 > 0 ? 'left' : 'left'}
          >
            {cellData?.tooltip &&
             <Tooltip
               title={cellData?.tooltip}
               placement="right"
             >
               <Typography className={styles[textClassName]}>
                 {formatNumberWithSpaces(cellData.value) || '-'}
               </Typography>
             </Tooltip>
            }
            {!cellData?.tooltip &&
             <Typography className={styles[textClassName]}>
               {formatNumberWithSpaces(cellData.value) || '-'}
             </Typography>
            }
          </TableCell>
        );
      })}
    </TableRow>
  );
};

export default MetricsBar;
