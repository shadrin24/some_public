import React from 'react';
import { Box } from "@mui/material";
import Typography from "@mui/material/Typography";

const AccountsListItem = ({
  accounts,
  renameList,
}) => {
  // console.log(accounts, renameList);
  return (
    <Box>
      {accounts.map(account => {
        return (
          <Typography key={account}>
            {account} {renameList[account]?.name ? `(${renameList[account]?.name})` : ''}
          </Typography>
        )
      })}
    </Box>
  );
};

export default AccountsListItem;