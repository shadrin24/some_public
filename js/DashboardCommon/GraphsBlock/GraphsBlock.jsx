import React, {
  useEffect,
  useState
} from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Stack,
  Typography
} from "@mui/material";
import { DrawdownsAreaChart } from "../../TerminalComponent/Chart/drawdownsArea";
import CloseButton from "../../TerminalComponent/common/CloseButton";
import UnitsButtons from "../../TerminalComponent/common/UnitsButtons";

const GraphsBlock = ({
  openGraphsBlock, setOpenGraphsBlock,
  metrics,
  portfolioMetrics,
  timeZone
}) => {

  const [units, setUnits] = useState('cum_units')
  let allUnits = []
  if (metrics?.cum_drawdawn_list && !portfolioMetrics?.drawdawns_list) allUnits = ['cum_units', 'percent']
  else if (!metrics?.cum_drawdawn_list && portfolioMetrics?.drawdawns_list) allUnits = ['portfolio_units', 'portfolio_percent']
  else if (metrics?.cum_drawdawn_list && portfolioMetrics?.drawdawns_list) allUnits = ['cum_units', 'percent', 'portfolio_units', 'portfolio_percent']
  console.log(units, portfolioMetrics)
  useEffect(() => {
    setUnits('cum_units')
  }, [metrics])
  return (
    <Dialog
      open={openGraphsBlock}
      onClose={() => setOpenGraphsBlock(false)}
      sx={{
        '& .MuiDialog-paper': {
          width: '100%', // Устанавливает ширину диалога в пикселях
          maxWidth: '70%', // Устанавливает максимальную ширину диалога в пикселях
          borderRadius: "0px",
          height: '90vh'

        }
      }}
    >
      <DialogContent
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "left",
          p: '0px',
          height: '100%',
          width: '100%'
        }}
        position={'relative'}
      >
        <CloseButton closeFunction={() => setOpenGraphsBlock(false)}/>
        <UnitsButtons units={units} setUnits={setUnits} allUnits={allUnits}/>
        <Box height='100%' width='100%'>
          <DrawdownsAreaChart
            portfolioMetrics={portfolioMetrics}
            metrics={metrics}
            timeZone={timeZone}
            units={units}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default GraphsBlock;