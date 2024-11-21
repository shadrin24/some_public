import {
  useState,
  React,
  useEffect
} from 'react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  List,
  Tab,
  Tabs,
  IconButton,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Tooltip,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from '@mui/material';
import styles from './Styles.module.css';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';

import { useAuthUser } from '@crema/hooks/AuthHooks';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import jwtAxios from '@crema/services/auth/JWT';
import { makeStyles } from '@mui/styles';

import axios from 'axios';
import AccountsList from './AccountList'
import SettingsGroupsWindow from "./AddGroupWindow/SettingsGroupsWindow";

const ChooseAccountsBlock = ({
  allAccountsInTrades,
  selectedAccounts,
  setSelectedAccounts,
  accountsType,
  renameList, setRenameList
}) => {
  const { user } = useAuthUser();
  const [openRenameBox, setOpenRenameBox] = useState(false);
  const [reName, setReName] = useState('');
  const [typeList, setTypeList] = useState('all');
  const [favoritesList, setFavoritesList] = useState({
    real: [],
    hidden: [],
  });
  const [accountsInGroups, setAccountsInGroups] = useState({ real: [], hidden: [] });
  const [accountsNotInGroups, setAccountsNotInGroups] = useState({ real: [], hidden: [] });
  const [favoritesAccountsInGroups, setFavoritesAccountsInGroups] = useState();
  const [accountsGroups, setAccountsGroups] = useState({
    real: {
      // "1": {name: 'Группа 1', accounts: ['677477RFCY9', '677477RGJZB']},
      // "2": {name: 'Группа 2', accounts: ['598599R9V89']},
      // "3": {name: 'Группа 3', accounts: ['677477RH5QC']},
      // "4": {name: 'Группа 4', accounts: ['677477RAWX4']},
      // "5": {name: 'Группа 5', accounts: ['123']},
    },
    hidden: {
      // "6": {name: 'Скрытая группа 1', accounts: ['AMER_LONG_HIDDEN', '677477RGJZB']},
      // "7": {name: 'Скрытая группа 2', accounts: ['598599R9V89']},
      // "8": {name: 'Скрытая группа 3', accounts: ['677477RH5QC']},
      // "9": {name: 'Скрытая группа 4', accounts: ['677477RAWX4']},
      // "10": {name: 'Скрытая группа 5', accounts: ['123']},
    }
  });
  const [updateAccountsGroups, setUpdateAccountsGroups] = useState(true);

  const [expanded, setExpanded] = useState(false);

  const [openAddGroupWindow, setOpenAddGroupWindow] = useState(false);

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  // const useStyles = makeStyles({
  //   accordion: {
  //     backgroundColor: 'transparent !important',
  //   },
  //   accordionSummary: {
  //     backgroundColor: 'transparent !important',
  //   },
  //   accordionDetails: {
  //     backgroundColor: 'transparent !important',
  //   },
  // });
  // const classes = useStyles();

  useEffect(() => {
    // Список избранного
    jwtAxios
      .get('https://api.123.123/api/getcustomdata?name=favorites:' + user.email)
      .then((json) => {
        if (json.data == null) {
          jwtAxios.post('https://api.123.123/api/customdata', {
            name: 'favorites:' + user.email,
            data: {
              real: [],
              hidden: [],
            },
          });
        }
        else {
          setFavoritesList(json.data);
        }
      })
      .catch((e) => {
        console.log('ERROR: ' + e);
      });
  }, []);

  useEffect(() => {
    // Список групп
    jwtAxios
      .get('https://api.123.trade/api/getcustomdata?name=accounts_groups:' + user.email)
      .then((json) => {
        // console.log(json);
        if (json.data == null) {
          jwtAxios.post('https://api.123.trade/api/customdata', {
            name: 'accounts_groups:' + user.email,
            data: {
              real: {},
              hidden: {},
            },
          });
        }
        else {
          setAccountsGroups(json.data);
        }
      })
      .catch((e) => {
        console.log('ERROR: ' + e);
      });
  }, [updateAccountsGroups]);

  // Собираем аккаунты в группы
  useEffect(() => {
    if (accountsGroups && allAccountsInTrades) {
      const getAccountsInGroups = (groupsList, accountsList) => {
        // console.log(groupsList, accountsList);
        let addedAccounts = [];
        // Создаем объект _accountsInGroups, который будет содержать группы аккаунтов
        let _accountsInGroups = Object.entries(groupsList).reduce((acc, [groupKey, groupData]) => {
          // Извлекаем массив аккаунтов из поля accounts
          const accounts = groupData.accounts;
          // Фильтруем аккаунты, которые присутствуют в accountsList
          const filteredAccounts = accounts.filter(account => accountsList.includes(account));
          // Если есть отфильтрованные аккаунты, добавляем их в объект _accountsInGroups
          if (filteredAccounts.length > 0) {
            acc[groupData.name] = filteredAccounts;
            addedAccounts.push(...filteredAccounts);
          }
          return acc;
        }, {});

        // Фильтруем аккаунты, которые не вошли в addedAccounts и присутствуют в accountsList
        const _otherAccounts = accountsList.filter(account => !addedAccounts.includes(account));
        // Если есть аккаунты, которые не вошли в группы, добавляем их в группу "Other"
        if (_otherAccounts.length > 0) {
          _accountsInGroups.Other = _otherAccounts;
        }
        console.log()
        return [_accountsInGroups, _otherAccounts];
      };


      // Создаем объект _accountsInGroups, который будет содержать группы аккаунтов
      // console.log(favoritesList);
      let [_realAccountsInGroups, _realAccountsNotInGroups] = getAccountsInGroups(accountsGroups?.real, allAccountsInTrades)
      let [_hiddenAccountsInGroups, _hiddenAccountsNotInGroups] = getAccountsInGroups(accountsGroups?.hidden, allAccountsInTrades)
      let _allAccountsInGroups = {
        real: _realAccountsInGroups,
        hidden: _hiddenAccountsInGroups,
      }
      // console.log(_allAccountsInGroups);
      let _allAccountsNotInGroups = {
        real: _realAccountsNotInGroups,
        hidden: _hiddenAccountsNotInGroups,
      }
      let [_favoritesRealAccountsInGroups, _favoritesRealAccountsNotInGroups] = getAccountsInGroups(accountsGroups?.real, favoritesList?.real)
      let [_favoritesHiddenAccountsInGroups, _favoritesHiddenAccountsNotInGroups] = getAccountsInGroups(accountsGroups?.hidden, favoritesList?.hidden)
      let _favoritesAccountsInGroups = {
        real: _favoritesRealAccountsInGroups,
        hidden: _favoritesHiddenAccountsInGroups,
      }
      // console.log(_favoritesAccountsInGroups);

      setAccountsInGroups(_allAccountsInGroups)
      setAccountsNotInGroups(_allAccountsNotInGroups)
      setFavoritesAccountsInGroups(_favoritesAccountsInGroups)
      // console.log(_allAccountsInGroups, _favoritesAccountsInGroups);
    }
  }, [accountsGroups, allAccountsInTrades, favoritesList]);

  // console.log(accountsInGroups);
  return (
    <Box sx={{
      height: '100%',
      border: "1px solid",
      borderColor: "#525659",
      borderRadius: "10px",
      p: "0px 10px"
    }}>
      <Box height={'30px'} display={'flex'} flexDirection={'row'}>
        <Tabs
          sx={{
            width: '90%',
            mt: "-10px"
          }}
          value={typeList}
          indicatorColor={"none"}
          onChange={(event, newValue) => {
            setTypeList(newValue);
            setSelectedAccounts([]);
          }}
        >
          <Tab sx={{
            fontSize: 12,
            width: '50%',
          }} label="All" value="all"/>
          <Tab
            sx={{
              fontSize: 12,
              width: '50%'
            }}
            label="Favorites"
            value="favorites"
          />
        </Tabs>
        <IconButton
          aria-label="close"
          color="inherit"
          size="small"
          onClick={() => {
            setOpenAddGroupWindow(true);
          }}
        >
          <PlaylistAddIcon fontSize="inherit"/>
        </IconButton>
      </Box>
      <Box
        className={styles.box}
        sx={{
          paddingTop: '10px',
          '&::-webkit-scrollbar': {
            width: '5px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            borderRadius: '1px',
          },
        }}
      >
        <FormGroup>
          {Object.entries(
              typeList === 'all'
                ? accountsType === 'real'
                  ? accountsInGroups?.real
                  : accountsInGroups?.hidden
                : accountsType === 'real'
                  ? favoritesAccountsInGroups?.real
                  : favoritesAccountsInGroups?.hidden
            )
            .map(([groupName, accounts]) => {
                // console.log(groupName, accounts);
                // if (groupName !== 'Other')
                return (
                  <Accordion key={groupName}
                             expanded={expanded === groupName}
                             onChange={handleChange(groupName)}
                             sx={{
                               '&.MuiPaper-root': {
                                 boxShadow: 'none',
                               }
                             }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
                      <Typography>{groupName}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <AccountsList
                        typeList={typeList}
                        accountsList={accounts}
                        favoritesList={favoritesList}
                        setFavoritesList={setFavoritesList}
                        accountsType={accountsType}
                        renameList={renameList}
                        selectedAccounts={selectedAccounts}
                        setSelectedAccounts={setSelectedAccounts}
                        setOpenRenameBox={setOpenRenameBox}
                        setReName={setReName}
                        accounts={accounts} // Передаем аккаунты для отображения
                      />
                    </AccordionDetails>
                  </Accordion>
                )
                // else return (
                //   <AccountsList
                //     typeList={typeList}
                //     allAccountsInTrades={accounts}
                //     favoritesList={favoritesList}
                //     setFavoritesList={setFavoritesList}
                //     accountsType={accountsType}
                //     renameList={renameList}
                //     selectedAccounts={selectedAccounts}
                //     setSelectedAccounts={setSelectedAccounts}
                //     setOpenRenameBox={setOpenRenameBox}
                //     setReName={setReName}
                //     accounts={accounts} // Передаем аккаунты для отображения
                //     key={groupName}
                //   />
                // )
              }
            )}
        </FormGroup>
        <RenameBox
          open={openRenameBox}
          setOpen={setOpenRenameBox}
          origName={reName}
          renameList={renameList}
          setRenameList={setRenameList}
        />
      </Box>
      <SettingsGroupsWindow
        openAddGroupWindow={openAddGroupWindow} setOpenAddGroupWindow={setOpenAddGroupWindow}
        accountsGroups={accountsGroups} setAccountsGroups={setAccountsGroups}
        accountsType={accountsType}
        renameList={renameList}
        accountsNotInGroups={accountsNotInGroups}
        setUpdateAccountsGroups={setUpdateAccountsGroups}
      />
    </Box>
  );
};

const RenameBox = ({ open, setOpen, origName, renameList, setRenameList }) => {
  const [name, setName] = useState(origName);

  useEffect(() => {
    setName(
      renameList[origName] !== undefined ? renameList[origName].name : origName
    );
  }, [origName]);

  const handleClose = () => {
    setOpen(false);
  };

  const rename = async(acc) => {
    await jwtAxios.post('https://api.123.123/api/customdata', {
      name: 'tech_data:listAccName',
      data: { ...renameList, [origName]: { original: origName, name: name } },
    });
    setRenameList({
      ...renameList,
      [origName]: { original: origName, name: name },
    });
    handleClose();
  };

  return (
    <div>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle id="alert-dialog-title">{'Переименовать'}</DialogTitle>
        <DialogContent>
          <TextField
            disabled={false}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            id="outlined-multiline-flexible"
            fullWidth
            multiline
            maxRows={14}
          />
        </DialogContent>
        <DialogActions>
          <Button
            color="primary"
            variant="contained"
            onClick={() => {
              setName(origName);
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
            onClick={rename}
            autoFocus
          >
            Принять
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ChooseAccountsBlock;
