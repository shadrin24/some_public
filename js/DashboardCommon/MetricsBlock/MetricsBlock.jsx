import React, {
  useEffect,
  useState
} from 'react';
import styles from "./TableMUI.module.css";
import {
  Box,
  Grid,
  Stack,
  Table,
  Paper,
  TableHead,
  Typography,
  TableRow,
  TableCell,
  TableBody,
  DialogContent,
  Dialog,
  Menu,
  MenuItem,
  FormControlLabel,
  Checkbox,
  IconButton,
  TextField
} from "@mui/material";
import TableMUI from "@mui/material/Table";
import ButtonGroup from "@mui/material/ButtonGroup";
import Button from "@mui/material/Button";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useThemeContext } from "@crema/context/ThemeContextProvider";
import RemoveIcon from "@mui/icons-material/Remove";
import CloseButton from "../../TerminalComponent/common/CloseButton";
import CheckIcon from "@mui/icons-material/Check";
import 123 from "../../TerminalComponent/API/123";
import Tooltip from "@mui/material/Tooltip";
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const MetricsBlock = ({
    openMetricsBlock,
    setOpenMetricsBlock,
    metrics,
    longMetrics,
    shortMetrics
  }) => {
    const { theme } = useThemeContext();
    const [selectedSheet, setSelectedSheet] = useState(0);
    const [dataset, setDataset] = useState(null);
    const [filter, setFilter] = useState({});
    const [anchorEl, setAnchorEl] = useState(null);
    const [filterColumn, setFilterColumn] = useState(2);
    const [allTickers, setAllTickers] = useState([''])

    const getHelpText = (text) => {
      return `<span style="color: lightgray; font-size: 12px;">${text}</span>`
    }

    useEffect(() => {
      if (Object.keys(metrics)?.length) {
        // let allTrades = metrics["all_trades"][3];
        // Добавить списки полных сделок
        let allTradesRaw = metrics["trades_full"];
        let allTrades = allTradesRaw
        // console.log(filter[filterColumn]);
        if (filter[filterColumn]) {
          // console.log(allTrades);
          // Фильтруем массив массивов, оставляя только те, где первый объект содержит любое значение поля ticker из sortedTickers
          allTrades = allTrades.filter(subArray => {
            // console.log(filter[filterColumn]);
            // console.log(subArray)
            return filter[filterColumn].includes(subArray[0].ticker)
          });
          // console.log(allTrades);
        }

        // Извлекаем все значения поля ticker
        // console.log(metrics["all_trades"]);
        const tickers = metrics["all_trades"][3].map(trade => trade.ticker);
        // Создаем объект с уникальными тикерами и количеством их вхождений
        const tickerCounts = tickers.reduce((acc, ticker) => {
          acc[ticker] = (acc[ticker] || 0) + 1;
          return acc;
        }, {});
        // Сортируем ключи объекта в алфавитном порядке и формируем новый отсортированный объект
        const sortedTickerCounts = Object.keys(tickerCounts)
          .sort()
          .reduce((acc, ticker) => {
            acc[ticker] = tickerCounts[ticker];
            return acc;
          }, {});
        // console.log(sortedTickerCounts);
        setAllTickers(sortedTickerCounts);
        // // Удаляем дубликаты
        // const uniqueTickers = [...new Set(tickers)];
        // // Сортируем в алфавитном порядке
        // setAllTickers(uniqueTickers.sort());
        // console.log(metrics);
        // console.log(allTrades);
        let ratio = metrics?.average_profit_trade / metrics?.average_lose_trade || 0
        if (typeof ratio === 'number' && !Number.isInteger(ratio)) {
          ratio = parseFloat(ratio.toFixed(2));
        }
        let ratioLong = longMetrics?.average_profit_trade / longMetrics?.average_lose_trade || 0
        if (typeof ratioLong === 'number' && !Number.isInteger(ratioLong)) {
          ratioLong = parseFloat(ratioLong.toFixed(2));
        }
        let ratioShort = shortMetrics?.average_profit_trade / shortMetrics?.average_lose_trade || 0
        if (typeof ratioShort === 'number' && !Number.isInteger(ratioShort)) {
          ratioShort = parseFloat(ratioShort.toFixed(2));
        }

        let dataStrategyAnalysis = [
          ["Strategy Analysis", "", "", "", ""],
          ["", "All Trades", "Long Trades", "Short Trades", ""],
          ["Net Profit", metrics?.return, longMetrics?.return, shortMetrics?.return, getHelpText('Return - (sell_value_total / (buy_value_total + comission_total)) * 100 - 100')],
          ["", "", "", "", ""],
          ["Profit Factor", metrics?.profit_factor, longMetrics?.profit_factor, shortMetrics?.profit_factor, 'sell_value_total - buy_value_total - comission_total'],
          ["Max DrawDown (%)", metrics?.max_cum_drawdawn_percent, longMetrics?.max_cum_drawdawn_percent, shortMetrics?.max_cum_drawdawn_percent, 'Минимальное значение drawdawn в %'],
          ["Max DrawDown (days)", metrics?.max_cum_drawdawn_days, longMetrics?.max_cum_drawdawn_days, shortMetrics?.max_cum_drawdawn_days, 'Максимальное кол-во дней с просадкой'],
          ["Recovery Factor", metrics?.cum_recovery_factor, longMetrics?.cum_recovery_factor, shortMetrics?.cum_recovery_factor, 'Net profit / Max DrawDown (%)'],
          ["Recovery Factor +", metrics?.cum_recovery_factor_annual, longMetrics?.cum_recovery_factor_annual, shortMetrics?.cum_recovery_factor_annual, 'annual_return / Max DrawDown (%) (annual_return = Net profit / total_days * 365)'],
          ["", "", "", "", ""],
          ["Total of Trades", metrics?.trades_count, longMetrics?.trades_count, shortMetrics?.trades_count, 'Кол-во закрытых сделок'],
          ["% Profitable", metrics?.profit_trades_percent, longMetrics?.profit_trades_percent, shortMetrics?.profit_trades_percent, 'Кол-во положительных сделок / Кол-во закрытых сделок * 100'],
          ["Average Winning Trade", metrics?.average_profit_trade, longMetrics?.average_profit_trade, shortMetrics?.average_profit_trade, 'Сумма профита положительных сделок / Кол-во положительных сделок'],
          ["Average Losing Trade", metrics?.average_lose_trade, longMetrics.average_lose_trade, shortMetrics.average_lose_trade, 'Сумма профита отрицательных сделок / Кол-во отрицательных сделок'],
          ["Ratio Avg Win / Avg Loss", metrics?.ratio, longMetrics?.ratio, shortMetrics?.ratio, 'abs(Average Winning Trade / Average Losing Trade)'],
          ["Largest Winning Trade", metrics?.largest_winning_trade, longMetrics?.largest_winning_trade, shortMetrics?.largest_winning_trade, 'Максимальный доход за сделку'],
          ["Largest Losing Trade", metrics?.largest_losing_trade, longMetrics?.largest_losing_trade, shortMetrics?.largest_losing_trade, 'Максимальный убыток за сделку'],
          ["Max Profitable Series", metrics?.maximum_positive_series_of_trades, longMetrics?.maximum_positive_series_of_trades, shortMetrics?.maximum_positive_series_of_trades, 'Максимальная положительная серия сделок'],
          ["Max Loss Series", metrics?.maximum_negative_series_of_trades, longMetrics?.maximum_negative_series_of_trades, shortMetrics?.maximum_negative_series_of_trades, 'Максимальная отрицательная серия сделок'],
          ["Average Time in Trade", metrics?.average_days_in_trade, longMetrics?.average_days_in_trade, shortMetrics?.average_days_in_trade, 'Сумма времени в днях в каждой сделке / Кол-во закрытых сделок'],
          ["Total Days in Trades", metrics?.total_days_in_trade, longMetrics?.total_days_in_trade, shortMetrics?.total_days_in_trade, 'Общее время в дня в сделках с учетом нахлеста сделок'],
        ];

        let dataListOfTrades = [
          ["List of Trades", "", "", "", "", "", "", "", "", "", "", "", ""],
          [
            { name: "Trade #", tooltip: '123123' },
            { name: "Type", tooltip: '123123' },
            { name: "Ticker", tooltip: '123123' },
            // "ID #",
            { name: "Date", tooltip: '123123' },
            { name: "Time", tooltip: '123123' },
            { name: "Price", tooltip: '123123' },
            { name: "Value", tooltip: '123123' },
            // "Price*Quantity",
            { name: "Contracts", tooltip: '123123' },
            // "Currentpos",
            // "Contracts (cp)",
            { name: "Profit ($)", tooltip: 'Сумма продаж - сумма покупок - комиссия' },
            { name: "Profit (%)", tooltip: 'Сумма продаж / (сумма покупок + комиссия) * 100 - 100' },
            { name: "Cum. Profit ($)", tooltip: 'Кумулятивный Profit ($)' },
            { name: "Cum. Profit (%)", tooltip: 'Кум. сумма продаж / (кум. сумма покупок + кум. комиссия) * 100 - 100' },
            { name: "Drawdown ($)", tooltip: 'Кум. профит - последний максимальный профит' },
            { name: "Drawdown (%)", tooltip: 'Drawdown ($) / (кум. сумма покупок + кум. комиссия) * 100' },
          ],
        ];

        let newListTrades = []
        allTrades.map((fullTrade, indexFullTrade) => {
          // console.log(fullTrade);
          // const dateTimeFirstTrade = new Date(fullTrade[0]?.time)
          // console.log(dateTimeFirstTrade, new Date('2024-09-30 18:00:00'));
          // if (dateTimeFirstTrade > new Date('2024-09-30 18:00:00')) {
          const newFullTrade = fullTrade.map(
            (trade, indexTrade) => {
              // console.log(trade);
              const currentpos = trade.currentpos
              const buysell = trade.buysell
              const time = trade.time
              const price = trade.price
              const lastIndex = fullTrade.length - 1
              let profit = ''
              let profit_percent = ''
              let cum_profit = ''
              let cum_profit_percent = ''
              let drawdown = ''
              let drawdown_percent = ''


              let quantityQ
              let quantityCP = '-'
              if (trade.buysell === 'B') {
                quantityQ = trade.quantity
                quantityCP = trade.quantity_by_currentpos
              }
              else {
                quantityQ = trade.quantity !== 0
                  ? -trade.quantity
                  : 0
                quantityCP = trade.quantity_by_currentpos !== 0
                  ? -trade.quantity_by_currentpos
                  : 0
              }
              if (fullTrade[lastIndex]?.close_full_trade_by === 'both' || fullTrade.length === 1) {
                quantityCP = '-'
              }
              let entryExit = ''
              let numberFullTrade = ''
              if (indexTrade === 0) {
                numberFullTrade = indexFullTrade + 1
                entryExit = buysell === "S" ? "EntryShort S" : "EntryLong B"
                profit = Math.round(trade?.profit_trade * 100) / 100
                profit_percent = Math.round(trade?.return_percent_trade * 100) / 100
                cum_profit = Math.round(trade?.cum_profit * 100) / 100
                cum_profit_percent = Math.round(trade?.cum_return * 100) / 100
                drawdown = Math.round(trade?.cum_drawdawn * 100) / 100
                drawdown_percent = Math.round(trade?.cum_drawdawn_percent * 100) / 100
              }
              else if (indexTrade === lastIndex) {
                entryExit = buysell === "B" ? "ExitShort B" : "ExitLong S"
              }
              else entryExit = buysell
              if (lastIndex === 0) entryExit = buysell

              let profit_by_currentpos = '-'
              let return_percent_by_currentpos = '-'
              if (fullTrade.length !== 1) {
                profit_by_currentpos = indexTrade === 0 ? fullTrade[lastIndex]?.profit_by_currentpos : ''
                return_percent_by_currentpos = indexTrade === 0 ? fullTrade[lastIndex]?.return_percent_by_currentpos : ''
              }
              const defaultColor = fullTrade.length === 1
                ? 'gray'
                : fullTrade[lastIndex]?.profit_trade >= 0
                  ? 'green'
                  : 'red'

              let colorQuantityQ = ''
              let colorQuantityCP = ''
              if (fullTrade[lastIndex]?.close_full_trade_by !== 'both') {
                colorQuantityQ = fullTrade[lastIndex]?.close_full_trade_by === 'quantity' ? 'green' : ''
                if (fullTrade.length !== 1)
                  colorQuantityCP = fullTrade[lastIndex]?.close_full_trade_by === 'currentpos' ? 'green' : ''
              }
              const valueQuantity = Math.round(trade.quantity * price * 100) / 100

              return (
                [
                  { color: defaultColor, value: lastIndex === 0 ? numberFullTrade + '*' : numberFullTrade },
                  { color: defaultColor, value: entryExit },
                  { color: defaultColor, value: indexTrade === 0 ? trade.ticker : '' },
                  // { color: defaultColor, value: trade.id },
                  { color: defaultColor, value: time.split(" ")[0] },
                  { color: defaultColor, value: time.split(" ")[1] },
                  { color: defaultColor, value: price },
                  // { color: trade.value === valueQuantity ? defaultColor : "blue", value: trade.value },
                  { color: defaultColor, value: Math.round(trade.value * 100) / 100 },
                  // { color: trade.value === valueQuantity ? defaultColor : "blue", value: valueQuantity },
                  { color: defaultColor, value: quantityQ },
                  // { color: defaultColor, value: trade.currentpos },
                  // { color: colorQuantityCP, value: quantityCP },
                  { color: defaultColor, value: profit },
                  { color: defaultColor, value: profit_percent },
                  { color: defaultColor, value: cum_profit },
                  { color: defaultColor, value: cum_profit_percent },
                  { color: defaultColor, value: drawdown },
                  { color: defaultColor, value: drawdown_percent },
                ])
            }
          )
          newListTrades.push(...newFullTrade)
          // console.log(newListTrades);
          // }
        });
        // console.log(newListTrades);
        dataListOfTrades = [...dataListOfTrades, ...newListTrades];
        setDataset([dataStrategyAnalysis, dataListOfTrades]);
        // console.log(dataListOfTrades[0]);
      }
    }, [metrics, filter]);
    // console.log(dataset);

    // console.log(dataset);
    const handleButtonClick = (num) => {
      setSelectedSheet(num);
    };

    const handleFilterClick = (event, columnIndex) => {
      // console.log(event.target.parentElement.parentElement.parentElement);
      const cell = event.currentTarget.closest('th'); // Находим ближайшую ячейку
      // console.log(cell);
      setAnchorEl(cell); // Устанавливаем якорь на ячейку
      setFilterColumn(columnIndex);
    };

    const handleFilterClose = () => {
      setAnchorEl(null);
      setFilterColumn(null);
    };
    // console.log(filter);

    // console.log(filter);
    const handleFilterChange = (value) => {
      setFilter((prevFilters) => {
        const currentFilters = prevFilters[filterColumn] || [];
        // Проверяем, есть ли значение в текущих фильтрах
        if (currentFilters.includes(value)) {
          // Если да, то удаляем его
          return {
            ...prevFilters,
            [filterColumn]: currentFilters.filter((v) => v !== value),
          };
        }
        else {
          // Если нет, то добавляем его
          return {
            ...prevFilters,
            [filterColumn]: [...currentFilters, value],
          };
        }
      });
    };


    const handleSelectAll = () => {
      setFilter((prevFilters) => ({
        ...prevFilters,
        [filterColumn]: Object.keys(allTickers),
      }));
    };

    const handleUnselectAll = () => {
      setFilter((prevFilters) => ({
        ...prevFilters,
        [filterColumn]: [],
      }));
    };

    // Преобразуем объект allTickers в массив для отображения
    const tickerEntries = Object.entries(allTickers);

    const formatNumberWithSpaces = (number) => {
      return number.toString().split('').reverse().join('')
        .replace(/(\d{3})(?=\d)/g, '$1 ')
        .split('').reverse().join('');
    };

    if (dataset !== null) {
      return (
        <Dialog
          open={openMetricsBlock}
          onClose={() => setOpenMetricsBlock(false)}
          sx={{
            '& .MuiDialog-paper': {
              maxWidth: '80vw', // Устанавливает максимальную ширину диалога в пикселях
              height: '90vh', // Устанавливает максимальную ширину диалога в пикселях
              // backgroundColor: theme.palette.background.paper,
              borderRadius: "0px"
            }
          }}
        >
          <DialogContent className={theme.palette.mode === 'dark' ? styles.dialogContentDark : styles.dialogContentLight}
                         position={'relative'}>
            <CloseButton closeFunction={() => setOpenMetricsBlock(false)}/>
            <Stack sx={{
              height: "100%",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}>
              <Box height="50px" width={"100%"} justifyContent={"center"} alignItems={"start"} display={"flex"}>
                <Typography fontSize="20px">
                  {dataset[selectedSheet][0][0]}
                </Typography>
              </Box>
              <Box className={theme.palette.mode === 'dark' ? styles.boxLight : styles.boxDark}>
                <TableMUI
                  className={theme.palette.mode === 'dark' ? styles.tableDark : styles.tableLight}
                  sx={{
                    maxWidth: "100%",
                    height: "1%"
                    // maxHeight: "20%",
                  }}
                  stickyHeader
                  aria-label="collapsible table"
                >
                  <TableHead
                    bgcolor={theme.palette.background.paper}
                  >
                    {/*<TableRow>*/}
                    {/*    <TableCell*/}
                    {/*        colSpan={dataset[selectedSheet][0].length}*/}
                    {/*    >*/}
                    {/*        {dataset[selectedSheet][0][0]}*/}
                    {/*    </TableCell>*/}
                    {/*</TableRow>*/}
                    <TableRow>
                      {dataset[selectedSheet][1].map((value, j) => {
                        return (
                          <TableCell
                            key={j + "_RowCellHead"}
                          >
                            <Stack direction={'row'} justifyContent={'center'} alignItems={'center'}>
                              {value?.tooltip && j >= 8 && (
                                <Tooltip
                                  title={<span dangerouslySetInnerHTML={{ __html: value.tooltip }}/>}
                                  placement="top"
                                >
                                  <Typography fontSize={12}>{value.name}</Typography>
                                </Tooltip>
                              )}
                              {j < 8 && (
                                <Typography fontSize={12}>{value?.name ? value.name : value}</Typography>
                              )}
                              {value === 'Ticker' && (
                                <IconButton
                                  aria-label="close"
                                  color="inherit"
                                  size="small"
                                  onClick={(event) => handleFilterClick(event, j)}
                                  style={{ padding: '2px' }}
                                >
                                  <ExpandMoreIcon fontSize="inherit"/>
                                </IconButton>
                              )}
                            </Stack>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  {/*Strategy Analysis*/}
                  {selectedSheet === 0 &&
                   <TableBody>
                     {dataset[selectedSheet]
                       // Без строки заголовков
                       .slice(2)
                       .map((data, i) => {
                         // console.log(dataset[selectedSheet]);
                         // console.log(data, i);
                         return (
                           <TableRow key={i + "_Row"}>
                             {data.map((value, j) => {
                               return (
                                 <TableCell
                                   style={{ textAlign: selectedSheet === 1 ? "center" : null }}
                                   key={j + "_RowCell"}
                                 >
                                   {(() => {
                                     if (value === "") return ""
                                     else if (j == 4) return (
                                       <Tooltip
                                         title={<span dangerouslySetInnerHTML={{ __html: value }}/>}
                                         placement="right"
                                       >
                                         <HelpOutlineIcon style={{ cursor: "pointer", fontSize: 18 }}/>
                                       </Tooltip>
                                     )
                                     else if (value === undefined) return '-'
                                     else if (typeof value === 'number') return formatNumberWithSpaces(value)
                                     else return value // Если value не число, просто отображаем его
                                   })()}
                                 </TableCell>
                               );
                             })}

                             {/*/!* Добавляем ячейку с иконкой и тултипом в последнюю колонку *!/*/}
                             {/*<TableCell key={`${i}_info`}>*/}
                             {/*  <Tooltip title={data[4] || ""} placement="top" arrow>*/}
                             {/*    <HelpOutlineIcon style={{ cursor: "pointer", fontSize: 18 }} />*/}
                             {/*  </Tooltip>*/}
                             {/*</TableCell>*/}
                           </TableRow>
                         );
                       })}
                   </TableBody>
                  }
                  {/*List Of Trades*/}
                  {selectedSheet === 1 &&
                   <TableBody>
                     {dataset[selectedSheet]
                       // Без строки заголовков
                       .slice(2)
                       .map((data, i) => {
                         // console.log(i, data[3]);
                         const borderBottom = data[0].value === '' || data[1].value.startsWith('Entry')
                           ? data[1].value.startsWith('Exit')
                             ? ''
                             : 'none'
                           : '';
                         return (
                           <TableRow key={i + "_Row"}>
                             {data.map(({ color, value }, j) => {
                               // console.log(j, value)
                               return (
                                 <TableCell
                                   style={{
                                     justifyContent: 'center',    // Центровка по горизонтали
                                     alignContent: 'center',        // Центровка по вертикали
                                     textAlign: selectedSheet === 1 ? "center" : null,
                                     borderBottom: borderBottom,
                                     color: color,
                                     height: '100%',              // Занимает всю высоту ячейки
                                   }}
                                   key={j + "_RowCell"}
                                 >
                                   {/*{j === 7 &&*/}
                                   {/* <CurrentPosEdit*/}
                                   {/*   value={value}*/}
                                   {/*   id={data[3].value}*/}
                                   {/*   field={'value'}*/}
                                   {/*   quantity={data[9].value}*/}
                                   {/*   price={data[6].value}*/}
                                   {/* />}*/}
                                   {/*{j === 9 &&*/}
                                   {/* <CurrentPosEdit*/}
                                   {/*   value={value}*/}
                                   {/*   id={data[3].value}*/}
                                   {/*   field={'quantity'}*/}
                                   {/*   quantity={data[9].value}*/}
                                   {/*   price={data[6].value}*/}
                                   {/* />}*/}
                                   {/*{j === 10 &&*/}
                                   {/* <CurrentPosEdit*/}
                                   {/*   value={value}*/}
                                   {/*   id={data[3].value}*/}
                                   {/*   field={'currentpos'}*/}
                                   {/*   quantity={data[9].value}*/}
                                   {/*   price={data[6].value}*/}
                                   {/* />}*/}
                                   {
                                     // j !== 7 && j !== 9 && j !== 10 &&
                                     typeof value === 'number' ?
                                       formatNumberWithSpaces(value)
                                       : value // Если value не число, просто отображаем его
                                   }
                                 </TableCell>
                               );
                             })}
                           </TableRow>
                         );
                       })}
                   </TableBody>
                  }
                </TableMUI>
              </Box>
              <Box height="10%" alignItems="end" display="flex">
                <ButtonGroup variant="outlined" aria-label="Basic button group">
                  <Button
                    onClick={() => handleButtonClick(0)}
                    variant={selectedSheet === 0 ? "contained" : "outlined"}
                  >
                    Strategy Analysis
                  </Button>
                  <Button
                    onClick={() => handleButtonClick(1)}
                    variant={selectedSheet === 1 ? "contained" : "outlined"}
                  >
                    List of Trades
                  </Button>
                </ButtonGroup>
              </Box>
            </Stack>
          </DialogContent>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleFilterClose}
            PaperProps={{
              style: {
                maxHeight: '70vh', // Установите желаемую максимальную высоту
                // width: '100%', // Установите желаемую ширину
              }
            }}
          >
            {filterColumn === 2 && selectedSheet === 1 && (
              <Box width={'100%'} sx={{
                '.MuiMenuItem-root': {
                  padding: '5px 5px'
                },
                '.MuiFormControlLabel-root': {
                  marginRight: '5px'
                }
              }}>
                <MenuItem key="select-all" onClick={handleSelectAll} sx={{ justifyContent: 'center', paddingRight: '15px' }}>
                  <Typography>Select All</Typography>
                </MenuItem>
                <MenuItem key="unselect-all" onClick={handleUnselectAll} sx={{ justifyContent: 'center', paddingRight: '15px' }}>
                  <Typography>Unselect All</Typography>
                </MenuItem>
                {/*{allTickers.map((ticker) => {*/}
                {/*  // console.log(ticker);*/}
                {/*  return (*/}
                {/*    <MenuItem key={ticker}>*/}
                {/*      <FormControlLabel*/}
                {/*        control={*/}
                {/*          <Checkbox*/}
                {/*            checked={filter[filterColumn]?.includes(ticker) || false}*/}
                {/*            onChange={() => handleFilterChange(ticker)}*/}
                {/*            sx={{*/}
                {/*              padding: '0px 5px 0px 0px'*/}
                {/*            }}*/}
                {/*          />*/}
                {/*        }*/}
                {/*        label={ticker}*/}
                {/*      />*/}
                {/*    </MenuItem>*/}
                {/*  )*/}
                {/*})}*/}

                {tickerEntries.map(([ticker, count]) => (
                  <MenuItem key={ticker} sx={{ width: '100%' }}>
                    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row' }}>
                      <Checkbox
                        checked={filter[filterColumn]?.includes(ticker) || false}
                        onChange={() => handleFilterChange(ticker)}
                        sx={{
                          padding: '0px 5px 0px 0px',
                        }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '30px' }}>
                        <Typography display={'flex'} alignItems={'center'}>{ticker}</Typography>
                        <Typography color={"lightgrey"} fontSize={14} display={'flex'} alignItems={'center'}>({count})</Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Box>
            )}
          </Menu>
        </Dialog>
      )
    }
  }
;

const CurrentPosEdit = ({ value, id, field, price, quantity }) => {
  const [newValue, setNewValue] = useState(value); // Состояние для хранения значения инпута

  // Обработчик изменения значения инпута
  const handleInputChange = (event) => {
    setNewValue(event.target.value);
  };

  // Обработчик нажатия на кнопку
  const handleUpdateCurrentpos = () => {
    if (field === 'currentpos') 123.updateCurrentposByID(id, newValue)
    if (field === 'quantity') 123.updateQuantityByID(id, newValue)
    if (field === 'value') 123.updateValueByID(id, Math.abs(price * quantity))
    console.log(field, id, value, Math.abs(price * quantity))
    setNewValue(value)
  };

  return (
    <Box display="flex" alignItems="center"> {/* Контейнер для выравнивания по горизонтали */}
      <TextField
        id={"standard-search-" + value}
        variant="standard"
        value={newValue}
        size="small"
        onChange={handleInputChange} // Привязка изменения инпута
        InputProps={{
          disableUnderline: true, // Убирает нижнее подчеркивание
          sx: {
            fontSize: '12px',
            textAlign: 'center', // Центровка текста по горизонтали
            minWidth: '50px',
            '& input': {
              textAlign: 'center', // Центровка текста внутри input
              appearance: 'none', // Убираем крестик очистки
              padding: '4px 0', // Уменьшаем отступы сверху и снизу для центровки
            }
          }
        }}
      />
      <IconButton
        aria-label="close"
        color="inherit"
        size="small"
        onClick={() => handleUpdateCurrentpos()}
        sx={{
          padding: '4px', // Уменьшаем внутренние отступы до 4px
        }}
      >
        <CheckIcon fontSize="inherit" sx={{ color: 'blue' }}/> {/* Иконка наследует размер от кнопки */}
      </IconButton>
    </Box>
  );
}

export default MetricsBlock;