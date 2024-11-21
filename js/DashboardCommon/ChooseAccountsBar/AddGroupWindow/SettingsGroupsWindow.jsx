import React, { useState } from 'react';
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
  Typography
} from "@mui/material";
import { DrawdownsAreaChart } from "../../../TerminalComponent/Chart/drawdownsArea";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AccountsList from "../AccountList";
import AccountsListItem from "./AccountsListItem";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import AddIcon from "@mui/icons-material/Add";
import EditGroupWindow from "./EditGroupWindow";
import RemoveIcon from "@mui/icons-material/Remove";
import jwtAxios from "@crema/services/auth/JWT";
import { useAuthUser } from "@crema/hooks/AuthHooks";
import CloseButton from "../../../TerminalComponent/common/CloseButton";

const SettingsGroupsWindow = ({
  openAddGroupWindow, setOpenAddGroupWindow,
  accountsGroups, setAccountsGroups,
  accountsType,
  renameList,
  accountsNotInGroups,
  setUpdateAccountsGroups
}) => {
  const { user } = useAuthUser();
  const [openEditGroupWindow, setOpenEditGroupWindow] = useState(false)
  const [groupForEdit, setGroupForEdit] = useState()

  const handleRemoveGroup = (groupKey) => {
    console.log(groupKey);

    const data = {
      ...accountsGroups,
    }
    accountsType === 'real'
      ? delete data.real[groupKey]
      : delete data.hidden[groupKey]
    console.log(data);
    jwtAxios.post('https://api.123.123/api/customdata', {
        name: 'accounts_groups:' + user.email,
        data: data
      })
      .then(setUpdateAccountsGroups(prevState => !prevState));
  }
  const handleAddNewGroup = () => {
    let groupKey
    if (accountsType === 'real') {
      Object.keys(accountsGroups?.real).length
        ? groupKey = Math.max(...Object.keys(accountsGroups.real).map(Number))+1
        : groupKey = '1'
    }
    else {
      Object.keys(accountsGroups?.hidden).length
        ? groupKey = Math.max(...Object.keys(accountsGroups.hidden).map(Number))+1
        : groupKey = '1'
    }
    console.log(groupKey, Object.keys(accountsGroups?.real));
    setOpenEditGroupWindow(true);
    // setOpenAddGroupWindow(false);
    setGroupForEdit({
      groupKey: groupKey,
      name: '',
      accounts: []
    })
  }

  // console.log(accountsGroups[accountsType], accountsType);
  return (
    <Dialog
      open={openAddGroupWindow}
      onClose={() => setOpenAddGroupWindow(false)}
      sx={{
        '& .MuiDialog-paper': {
          maxWidth: '70vw', // Устанавливает ширину диалога в пикселях
          // maxWidth: '70%', // Устанавливает максимальную ширину диалога в пикселях
          borderRadius: "0px",
          maxHeight: '70vh'

        }
      }}
    >
      <DialogContent
        sx={{
          p: '0px 0px',
        }}
        position={'relative'}
      >
        <CloseButton closeFunction={() => setOpenAddGroupWindow(false)}/>
        <Box height='100%' width='100%'
             sx={{
               display: "flex",
               alignItems: "start",
               justifyContent: "left",
               p: '0px 20px',
               height: '100%',
               width: '100%',
               flexDirection: 'column'
             }}>
          <Box sx={{
            borderBottom: '1px solid gray',
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: '10px',
            height: '100%',
            width: '100%',
          }}>
            <Typography fontSize={18} width={'90%'} textAlign={'center'}>Группы</Typography>
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleAddNewGroup}
            >
              <AddIcon fontSize="inherit"/>
            </IconButton>
          </Box>

          <Box sx={{ borderBottom: '1px solid gray' }}>
            {Object.entries(accountsGroups[accountsType])
              .map(([groupKey, groupdata]) => {
                const groupName = groupdata.name; // Предполагаем, что у вас есть поле name в groupdata
                const accounts = groupdata.accounts; // Предполагаем, что у вас есть поле accounts в groupdata

                // console.log(groupName, accounts);

                return (
                  <Accordion key={groupKey}
                             expanded={true}
                             sx={{
                               '&.MuiPaper-root': {
                                 boxShadow: 'none',
                               }
                             }}>
                    <AccordionSummary>
                      <Box sx={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <Typography>{groupName}</Typography>
                        <Box>
                          <IconButton
                            aria-label="close"
                            color="inherit"
                            size="small"
                            onClick={() => {
                              setOpenEditGroupWindow(true);
                              setGroupForEdit({
                                groupKey: groupKey,
                                name: groupName,
                                accounts: accounts
                              })
                            }}
                          >
                            <PlaylistAddIcon fontSize="inherit"/>
                          </IconButton>
                          <IconButton
                            aria-label="close"
                            color="inherit"
                            size="small"
                            onClick={() => handleRemoveGroup(groupKey)}
                          >
                            <RemoveIcon fontSize="inherit"/>
                          </IconButton>
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box pl={"20px"}>
                        <AccountsListItem accounts={accounts} renameList={renameList} accountsNotInGroups={accountsNotInGroups}/>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                )
              })}
          </Box>
          <Box p={'10px 8px'}>
            <AccountsListItem accounts={accountsNotInGroups[accountsType]} renameList={renameList}/>
          </Box>
        </Box>
      </DialogContent>
      <EditGroupWindow
        groupForEdit={groupForEdit}
        openEditGroupWindow={openEditGroupWindow} setOpenEditGroupWindow={setOpenEditGroupWindow}
        setOpenAddGroupWindow={setOpenAddGroupWindow}
        accountsNotInGroups={accountsNotInGroups[accountsType]}
        accountsGroups={accountsGroups}
        accountsType={accountsType}
        setUpdateAccountsGroups={setUpdateAccountsGroups}
        renameList={renameList}
      />
    </Dialog>
  );
};

export default SettingsGroupsWindow;