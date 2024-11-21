import React, {
  useEffect,
  useState
} from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DrawdownsAreaChart } from "../../../TerminalComponent/Chart/drawdownsArea";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AccountsList from "../AccountList";
import AccountsListItem from "./AccountsListItem";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import jwtAxios from "@crema/services/auth/JWT";
import { useAuthUser } from "@crema/hooks/AuthHooks";
import CloseButton from "../../../TerminalComponent/common/CloseButton";

const EditGroupWindow = ({
  groupForEdit,
  openEditGroupWindow, setOpenEditGroupWindow,
  setOpenAddGroupWindow,
  accountsNotInGroups,
  accountsGroups,
  accountsType,
  setUpdateAccountsGroups,
  renameList,
}) => {
  const { user } = useAuthUser();
  const [editedGroup, setEditedGroup] = useState()
  const [editedAccountsNotInGroups, setEditedAccountsNotInGroups] = useState()

  const handleAddAccountInGroup = (account) => {
    setEditedGroup(prevState => {
      if (!prevState) {
        return { accounts: [account] };
      }
      return {
        ...prevState,
        accounts: [...prevState.accounts, account]
      };
      // // Получаем ключ объекта
      // const key = Object.keys(prevState)[0];
      // // Получаем массив значений для этого ключа
      // const values = prevState[key];
      // // Добавляем новый аккаунт в массив значений
      // const updatedValues = [...values, account];
      // // Возвращаем новое состояние
      // return {
      //   ...prevState,
      //   accounts: [...prevState?.accounts, account]
      // };
    })
    setEditedAccountsNotInGroups(prevState => prevState.filter(acc => acc !== account))
  }

  const handleRemoveAccountsFromGroup = (account) => {
    setEditedGroup(prevState => {
      return { ...prevState, accounts: prevState?.accounts.filter(acc => acc !== account) }
      // // Получаем ключ объекта
      // const key = Object.keys(prevState)[0];
      // // Получаем массив значений для этого ключа
      // const values = prevState[key];
      // // Добавляем новый аккаунт в массив значений
      // const updatedValues = values.filter(acc => acc !== account);
      // // Возвращаем новое состояние
      // return {
      //   ...prevState,
      //   [key]: updatedValues
      // };
    })
    setEditedAccountsNotInGroups(prevState => [...prevState, account])
  }

  const handleRenameGroup = (event) => {
    setEditedGroup(prevState => {
      return {
        groupKey: prevState?.groupKey,
        accounts: prevState?.accounts,
        name: event.target.value
      }
    })
  }

  const handleSendChangeGroup = (event) => {
    const data = {
      ...accountsGroups,
    }
    accountsType === 'real'
      ? data.real[editedGroup.groupKey] = { name: editedGroup.name, accounts: editedGroup.accounts }
      : data.hidden[editedGroup.groupKey] = { name: editedGroup.name, accounts: editedGroup.accounts }
    console.log(data);
    jwtAxios.post('https://api.123.123/api/customdata', {
        name: 'accounts_groups:' + user.email,
        data: data
      })
      .then(() => {
        setUpdateAccountsGroups(prevState => !prevState)
        setOpenEditGroupWindow(false)
      });
  }

  useEffect(() => {
    setEditedGroup(groupForEdit)
  }, [groupForEdit])

  useEffect(() => {
    setEditedAccountsNotInGroups(accountsNotInGroups)
  }, [accountsNotInGroups])

  const onClose = () => {
    setOpenEditGroupWindow(false)
    setOpenAddGroupWindow(true);
    setEditedGroup(groupForEdit);
    setEditedAccountsNotInGroups(accountsNotInGroups);

  }

  return (
    <Dialog
      open={openEditGroupWindow}
      onClose={onClose}
      sx={{
        '& .MuiDialog-paper': {
          // width: '100%',
          maxWidth: '70vw', // Устанавливает ширину диалога в пикселях
          // maxWidth: '70%', // Устанавливает максимальную ширину диалога в пикселях
          borderRadius: "0px",
          maxHeight: '70vh',
          // height: '100%'

        }
      }}
    >
      <DialogContent
        sx={{
          display: "flex",
          alignItems: "start",
          justifyContent: "left",
          p: '20px',
          // height: '100%',
          // width: '100%'
        }}
        position={'relative'}
      >
        <CloseButton closeFunction={onClose}/>
        <Stack display={'flex'} flexDirection={'row'} columnGap={"20px"}>
          <Stack sx={{
            width: '100%',
            minWidth: '200px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'start',
          }}>
            <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '50px',
              pb: '10px',
              // mt: '-10px'
            }}>
              <TextField
                id="standard-search"
                variant="standard"
                label="Group name"
                type="search"
                value={editedGroup
                  ? editedGroup?.name
                  : ''}
                onChange={handleRenameGroup}
                size='small'
                InputProps={{
                  sx: { fontSize: '20px', display: 'flex', alignSelf: 'center', textAlign: 'center' } // Задаем размер текста
                }}
              />
              {/*<Typography>{editedGroup ? Object.keys(editedGroup)[0] : ''}</Typography>*/}
            </Box>
            <Box height={'100%'} width={'100%'}>
              {editedGroup && editedGroup?.accounts.map(account => {
                  // if (groupName !== 'Other')
                  return (
                    <Box key={account} sx={{
                      width: '100%',
                      minWidth: '200px',
                      display: 'flex',
                      whiteSpace: 'nowrap',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: '0px 10px',
                    }}>
                      <Typography>{account} {renameList[account]?.name ? `(${renameList[account]?.name})` : ''}</Typography>
                      <IconButton
                        aria-label="close"
                        color="inherit"
                        size="small"
                        onClick={() => handleRemoveAccountsFromGroup(account)}
                      >
                        <RemoveIcon fontSize="inherit"/>
                      </IconButton>
                    </Box>
                  )
                }
              )}
            </Box>
          </Stack><Box sx={{
          width: '100%',
          minWidth: '200px',
        }}>
          {editedAccountsNotInGroups && editedAccountsNotInGroups.map(account => {
            // if (groupName !== 'Other')
            return (
              <Box key={account} sx={{
                display: 'flex',
                width: '100%',
                whiteSpace: 'nowrap',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: '0px 10px',
              }}>
                <Typography sx={{ whiteSpace: 'nowrap' }}>{account} {renameList[account]?.name ? `(${renameList[account]?.name})` : ''}</Typography>
                <IconButton
                  aria-label="close"
                  color="inherit"
                  size="small"
                  onClick={() => handleAddAccountInGroup(account)}
                >
                  <AddIcon fontSize="inherit"/>
                </IconButton>
              </Box>
            )
          })}
        </Box>
          <Box>
            <Button
              disabled={editedGroup?.name === ''}
              onClick={handleSendChangeGroup}
            >
              Send
            </Button>
          </Box>

        </Stack>


      </DialogContent>
    </Dialog>
  );
};

export default EditGroupWindow;