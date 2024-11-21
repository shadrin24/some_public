import React from 'react';
import styles from "./Styles.module.css";
import {
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  List,
  Tooltip,
  Typography
} from "@mui/material";
import CreateIcon from "@mui/icons-material/Create";
import jwtAxios from "@crema/services/auth/JWT";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { useAuthUser } from "@crema/hooks/AuthHooks";

const AccountList = ({
  typeList,
  accountsList,
  favoritesList, setFavoritesList,
  accountsType,
  renameList,
  selectedAccounts, setSelectedAccounts,
  setOpenRenameBox,
  setReName,
}) => {
  const { user } = useAuthUser();
  const handleChangeUnions = (event, checked) => {
    // console.log(checked,event.target.checked)
    const union = event.target.name;
    if (checked) {
      setSelectedAccounts((prevUnions) => [...prevUnions, union]);
    }
    else {
      setSelectedAccounts((prevUnions) =>
        prevUnions.filter((item) => item !== union)
      );
    }
  };

  // console.log(accountsList)
  return (
    <List className={styles.list} subheader={<li/>}>
      {(accountsList
          ? accountsList
          : []
      ).map((account) => {
        return (
          <Box
            key={account}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'nowrap',
            }}
          >
            <Tooltip
              title={
                renameList[account] !== undefined &&
                renameList[account].name !==
                renameList[account].original ? (
                  <Typography sx={{ whiteSpace: 'pre-line', fontSize: 10 }}>
                    {renameList[account] !== undefined
                      ? renameList[account].name ===
                        renameList[account].original
                        ? renameList[account].name
                        : `Name: ${renameList[account].name} \n Account: ${renameList[account].original}`
                      : account}
                  </Typography>
                ) : null
              }
              placement={'bottom'}
              disableInteractive={true}
              PopperProps={{
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [0, -20],
                    },
                  },
                ],
              }}
            >
              <FormControlLabel
                sx={{ flexGrow: 1, overflow: 'hidden', }}
                control={
                  <Checkbox
                    checked={selectedAccounts.includes(account)}
                    name={account}
                    onChange={handleChangeUnions}
                  />
                }
                label={
                  <Typography noWrap variant="caption">
                    {renameList[account] !== undefined
                      ? renameList[account].name
                      : account}
                  </Typography>
                }
              />
            </Tooltip>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'nowrap',
              }}
            >
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => {
                  setOpenRenameBox(true);
                  setReName(account);
                }}
              >
                <CreateIcon fontSize="inherit"/>
              </IconButton>
              {accountsType === 'hidden' || accountsType === 'real' ? (
                <IconButton border={"1px solid red"}
                            aria-label="close"
                            color="inherit"
                            size="small"
                            onClick={() => {
                              favoritesList[accountsType] !== undefined &&
                              favoritesList[accountsType].includes(account)
                                ? setFavoritesList({
                                  ...favoritesList,
                                  [accountsType]: favoritesList[
                                    accountsType
                                    ].filter((item) => item !== account),
                                })
                                : setFavoritesList({
                                  ...favoritesList,
                                  [accountsType]: [
                                    ...favoritesList[accountsType],
                                    account,
                                  ],
                                });

                              jwtAxios.post('https://api.123.123/api/customdata', {
                                name: 'favorites:' + user.email,
                                data:
                                  favoritesList[accountsType] !== undefined &&
                                  favoritesList[accountsType].includes(account)
                                    ? {
                                      ...favoritesList,
                                      [accountsType]: favoritesList[
                                        accountsType
                                        ].filter((item) => item !== account),
                                    }
                                    : {
                                      ...favoritesList,
                                      [accountsType]: [
                                        ...favoritesList[accountsType],
                                        account,
                                      ],
                                    },
                              });
                            }}
                >
                  {favoritesList[accountsType] !== undefined &&
                   favoritesList[accountsType].includes(account) ? (
                    <StarIcon fontSize="inherit"/>
                  ) : (
                    <StarBorderIcon fontSize="inherit"/>
                  )}
                </IconButton>
              ) : null}
            </div>
          </Box>
        );
      })}
    </List>
  );
};

export default AccountList;