import {
  useEffect,
  useRef,
  useState
} from 'react';
import AnyChart from 'anychart-react';
import anychart from 'anychart';
import moment from "moment/moment";
import { Box } from "@mui/material";
import styles from "./Chart.module.css";
import { useThemeContext } from "@crema/context/ThemeContextProvider";

let stage;
let chart;
let scroller;
let dataTableDd;
let dataTableEq;
if (typeof anychart === 'object') {
  // create line Chart
  stage = anychart.graphics.create();
  // create a data table using this data
  dataTableDd = anychart.data.table('time');
  dataTableEq = anychart.data.table('time');
  chart = anychart.stock(); //anychart.rangeColumn();
  chart.bounds(0, 0, '100%', '100%');
  // chart.crosshair().displayMode('float');
  chart.background({ fill: 'transparent' });
  // chart.plot(0).yScale().minimumGap(0.1);
  // chart.plot(0).yScale().maximumGap(0.1);
  chart.interactivity().zoomOnMouseWheel(true);
  // design_chart(chart);
}

export function DrawdownsAreaChart({
  metrics,
  portfolioMetrics,
  timeZone,
  units
}) {
  const { theme } = useThemeContext();
  let drawdawns, equities
  let unitStr = ', руб.'

  console.log(metrics);
  // console.log(portfolioMetrics?.drawdawns_percent_list);
  useEffect(() => {
    if (metrics?.cum_drawdawn_list) {
      // console.log(metrics.cum_drawdawn_list);
      switch (units) {
        case 'cum_units':
          drawdawns = metrics.cum_drawdawn_list
          equities = metrics.cum_equity_list
          unitStr = ', руб.'
          break;
        case 'percent':
          drawdawns = metrics.cum_drawdawn_percent_list
          equities = metrics.cum_equity_percent_list
          unitStr = ', %.'
          break;
        case 'portfolio_units':
          drawdawns = portfolioMetrics?.drawdawns_list
          equities = portfolioMetrics?.equity_list
          unitStr = ', руб.'
          break;
        case 'portfolio_percent':
          drawdawns = portfolioMetrics?.drawdawns_percent_list
          equities = portfolioMetrics?.equity_percent_list
          unitStr = ', %.'
          break;
      }

      dataTableEq.remove()
      dataTableDd.remove()
      // Удаляем предыдущие слои маркеров
      chart.plot(0).removeSeries('equities');
      chart.plot(1).removeSeries('drawdowns');

      dataTableEq.addData(equities);  // данные эквити
      dataTableDd.addData(drawdawns); // данные дроуданов
      // console.log(equities);
      // console.log(drawdawns);
      const mappingEq = dataTableEq.mapAs({ value: 'equity' });  // Маппинг эквити
      const mappingDd = dataTableDd.mapAs({ value: 'drawdawn' });  // Маппинг друодаунов

      design_chart(chart, timeZone, theme, unitStr);
      // Графики эквити и дд
      const eqChart = chart.plot(0).area(mappingEq)
      const ddChart = chart.plot(1).area(mappingDd)
      eqChart.name('Equities').id('equities')
      ddChart.name('Drawdowns').id('drawdowns')
      // eqChart.fill(theme.palette.mode === 'dark' ? 'rgba(0,253,254,0.5)' : 'rgba(19,53,73, 0.7)')
      eqChart.fill(theme.palette.mode === 'dark' ? 'rgba(0,253,254,0.5)' : 'rgba(10,145,148,0.5)')
      // eqChart.fill('rgba(0,253,254,0.5)')
      eqChart.stroke('rgba(14,0,0,0.5)')
      ddChart.fill('rgba(255,0,0,0.2)')
      ddChart.stroke('rgba(255,0,0, 0.5)')

      // Данные в скроллер
      const scroller = chart.scroller()
      scroller.area(mappingEq);
      // ddChart.zIndex(0);
      // задать активные границы скроллера
      chart.selectRange(
        drawdawns[0].time,
        drawdawns[drawdawns.length - 1].time
      );
      //
      // var controller = chart.plot(0).annotations();

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

      chart.listen('selectedrangechange', function (event) {
        if (event.firstKey === event.firstSelected) {
          // console.log('999')
        }
        else {
          try {
            // const endDate = new Date(event.lastSelected);
            // const startDate = new Date(event.firstSelected);
            // const selectedData = dataForScroller.filter(
            //     (item) =>
            //         new Date(item.timestamp) < endDate &&
            //         new Date(item.timestamp) > startDate
            // );
            //
            // const highestHigh = selectedData.reduce(
            //     (max, item) => (item.high > max ? item.high : max),
            //     0
            // );
            // const lowestLow = selectedData.reduce(
            //     (min, item) => (item.low < min ? item.low : min),
            //     Infinity
            // );
            //
            // chart.plot(0).yScale().minimumGap(0);
            // chart.plot(0).yScale().maximumGap(0);
            // if (lowestLow !== Infinity) {
            //     chart
            //         .plot(0)
            //         .yScale()
            //         .minimum(lowestLow - (highestHigh - lowestLow) * 0.15);
            //     chart
            //         .plot(0)
            //         .yScale()
            //         .maximum(highestHigh + (highestHigh - lowestLow) * 0.15);
            // }
          }
          catch {
            console.log('error')
          }
        }
      });

      // chart.listen('annotationChangeFinish', function (e) {
      //     // const value = e.annotation.Oa.valueAnchor;
      //     const value = parseFloat(
      //         (
      //             Math.round(
      //                 e.annotation.Oa.valueAnchor / (minStep * 10 ** -decimals)
      //             ) *
      //             (minStep * 10 ** -decimals)
      //         ).toFixed(decimals)
      //     );
      //     if (chart.plot(0).annotations().getAnnotationAt(0) === e.annotation) {
      //         console.log('green', value);
      //         setTriggerBuySell([value, buySellTrigger[1]]);
      //     } else if (
      //         chart.plot(0).annotations().getAnnotationAt(1) === e.annotation
      //     ) {
      //         console.log('red', value);
      //         setTriggerBuySell([buySellTrigger[0], value]);
      //     }
      //     // console.log(typeof(value));
      //     // console.log(e);
      // });

    }
  }, [metrics, units]);


  return (
    <Box height='100%' width='100%'>
      <Chart stage={stage} chart={chart}/>
    </Box>
  );
}

function Chart(props) {
  const { dataLoading, isDataLoading, stage, chart } = props;
  const { theme } = useThemeContext();
  // console.log(theme.palette);

  return dataLoading ? (
    <div id="loader"></div>
  ) : (
    <Box id="dd_eq_charts"
         className={theme.palette.mode === 'dark' ? styles.containerDark : styles.containerLight}
         bgcolor={theme.palette.background.paper}
    >
      <AnyChart
        instance={stage}
        id="dd_eq_charts"
        width="100%"
        height='100%'
        charts={[chart]}
      />
    </Box>
  );
}

function design_chart(ch, timeZone, theme, unitStr) {
  // set tooltip text template
  let tooltip = ch.tooltip();
  tooltip.titleFormat((value) => {
    // Преобразование времени в желаемый часовой пояс (например, 'America/New_York')
    let date = moment.utc(value.x).tz(timeZone);
    let formattedTime = date.format('DD.MM.yyyy HH:mm');
    // Возвращаем отформатированное время
    return formattedTime;
  });
  tooltip.format(function () {
    // console.log(this);
    return this.seriesName + ': ' + this.value + unitStr
    /* code of your function */
  });


  // Убрать ручки скроллера
  const scroller = ch.scroller()
  scroller.thumbs(false);
  scroller.enabled(false)
  const eq_chart = ch.plot(0)
  const dd_chart = ch.plot(1)
  // eq_chart.legend(false)
  // dd_chart.legend(false)
  // configure the format of the legend title
  eq_chart.legend().titleFormat(function () {
    // Преобразование времени в желаемый часовой пояс (например, 'America/New_York')
    let date = moment.utc(this.value).tz(timeZone);
    return date.format('DD.MM.YYYY HH:mm');
  });
  dd_chart.legend().titleFormat(function () {
    // Преобразование времени в желаемый часовой пояс (например, 'America/New_York')
    let date = moment.utc(this.value).tz(timeZone);
    return date.format('DD.MM.YYYY HH:mm');
  });
  eq_chart.legend().itemsFormat(function () {

    return this.value + unitStr;
  });
  dd_chart.legend().itemsFormat(function () {
    return this.value + unitStr;
  });
  eq_chart.height('75%')
  dd_chart.height('25%')
  eq_chart.yAxis(0).enabled(false);
  dd_chart.yAxis(0).enabled(false);
  const eqY = eq_chart.yAxis(1)
  const ddY = dd_chart.yAxis(1)
  eqY.orientation('right');
  ddY.orientation('right');
  ch.padding().right(90);
  ch.padding().left(30);
  eqY.labels().format(function () {
    return this.value.toFixed(1);
  });
  ddY.labels().format(function () {
    return this.value.toFixed(1);
  });

  const eqX = ch.plot(0).xAxis()
  const ddX = ch.plot(1).xAxis()
  eqX.minorLabels().enabled(false)
  eqX.labels().enabled(false)

  ddX.minorLabels().format((value) => {
    // Преобразование времени в желаемый часовой пояс (например, 'America/New_York')
    let date = moment.utc(value.dataValue).tz(timeZone);
    let formattedTime = date.format('HH:mm');
    // Возвращаем отформатированное время
    return formattedTime;
  });
  ddX.labels().format((value) => {
    // Преобразование времени в желаемый часовой пояс (например, 'America/New_York')
    let date = moment.utc(value.dataValue).tz(timeZone);
    let formattedTime = date.format('DD.MM');
    // Возвращаем отформатированное время
    return formattedTime;
  });

  eqY.stroke('rgba(0, 0, 0, 0)');
  eqY.ticks().stroke('rgba(0, 0, 0, 0)');
  eqY.minorTicks().stroke('rgba(0, 0, 0, 0)');
  ddY.stroke('rgba(0, 0, 0, 0)');
  ddY.ticks().stroke('rgba(0, 0, 0, 0)');
  ddY.minorTicks().stroke('rgba(0, 0, 0, 0)');

  const eqGridY = eq_chart.yGrid()
  const eqGridX = eq_chart.xMinorGrid()
  const ddGridY = dd_chart.yGrid()
  const ddGridX = dd_chart.xMinorGrid()
  const colorGrid = theme.palette.mode === 'dark' ? '#ffffff' : '#000000'
  eqGridY.enabled(true).stroke({ color: colorGrid, thickness: 0.2, })
  eqGridX.enabled(true).stroke({ color: colorGrid, thickness: 0.2, }).drawLastLine(false).drawFirstLine(false);
  ddGridY.enabled(true).stroke({ color: colorGrid, thickness: 0.2, })
  ddGridX.enabled(true).stroke({ color: colorGrid, thickness: 0.2, }).drawLastLine(false).drawFirstLine(false);


  const yScale = eq_chart.yScale();
  // const range = yScale.max - yScale.min;
  // console.log(yScale, yScale['min'])
  // const interval = range * 1; // 10% от диапазона
  eq_chart.yScale().ticks().interval(1);
  dd_chart.yScale().ticks().interval(2, 2);


  // Перекрестие
  const ddCrosshair = chart.plot(0).crosshair()
  ddCrosshair.xStroke("#888888", 0.5, "3 3", "round")
  ddCrosshair.yStroke("#757883", 0.5, "3 3", "round")
  const ddCrosshairYLabel = chart.plot(0).crosshair().yLabel()
  ddCrosshairYLabel.axisIndex(1)
    .format("{%Value}")
    .fontColor("white")
    .background({
      fill: "#888888",
      stroke: "#888888"
    });

  const eqCrosshair = chart.plot(1).crosshair()
  eqCrosshair.xStroke("#888888", 0.5, "3 3", "round")
  const eqCrosshairXLabel = chart.plot(1).crosshair().xLabel()
  eqCrosshairXLabel.format((value) => {
      // Преобразование времени в желаемый часовой пояс (например, 'America/New_York')
      const date = moment.utc(value.rawValue).tz(timeZone);
      const formattedTime = date.format('DD.MM.yyyy HH:mm');
      // Возвращаем отформатированное время
      return formattedTime;

      // anychart.format.dateTime(value.rawValue, "dd.MM.yyyy HH:mm:ss")
    })
    .fontColor("white")
    .background({
      fill: "#888888",
      stroke: "#888888"
    });
  // crosshair.yLabel().enabled(false)
  eqCrosshair.yStroke("#757883", 0.5, "3 3", "round")
  const eqCrosshairYLabel = chart.plot(1).crosshair().yLabel()
  eqCrosshairYLabel.axisIndex(1)
    .format("{%Value}")
    .fontColor("white")
    .background({
      fill: "#888888",
      stroke: "#888888"
    });

  // Индикатор цены справа
  // const priceIndicator = ch.plot(0).priceIndicator();
  // priceIndicator.axis(ch.plot(0).yAxis(1))
  // priceIndicator.value('series-end');
  // priceIndicator.valueField('equity');
  // priceIndicator.stroke('#727272');
  // priceIndicator.label({background: '#727272'});
  // priceIndicator.risingStroke('#089881');
  // priceIndicator.risingLabel({background: '#089881'});
}