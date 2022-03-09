'use strict'

import React, { useState, useEffect } from 'react'
import {
   View,
   Text,
   Alert,
   StyleSheet,
   Animated,
   NativeModules,
   NativeEventEmitter,
   Platform,
   TouchableOpacity
} from 'react-native'

import { SafeAreaView } from 'react-native-safe-area-context'

import {
   IterableInboxCustomizations,
   useAppStateListener,
   useDeviceOrientation,
   IterableInAppDeleteSource,
   IterableInAppLocation,
   IterableInboxEmptyState,
   InboxImpressionRowInfo
} from '.'

import { Iterable } from './Iterable'

import IterableInboxMessageList from './IterableInboxMessageList'
import IterableInboxMessageDisplay from './IterableInboxMessageDisplay'
import IterableInboxDataModel from './IterableInboxDataModel'
import InboxRowViewModel from './InboxRowViewModel'

import { useIsFocused } from '@react-navigation/native'

const RNIterableAPI = NativeModules.RNIterableAPI
const RNEventEmitter = new NativeEventEmitter(RNIterableAPI)

type inboxProps = {
   returnToInboxTrigger: boolean,
   messageListItemLayout?: Function,
   customizations?: IterableInboxCustomizations,
   tabBarHeight?: number,
   tabBarPadding?: number
}

const IterableInboxTest = ({
   returnToInboxTrigger,
   messageListItemLayout = () => { return null },
   customizations = {} as IterableInboxCustomizations,
   tabBarHeight = 80,
   tabBarPadding = 20
}: inboxProps) => {
   const defaultInboxTitle = "Inbox"
   const inboxDataModel = new IterableInboxDataModel()

   let { height, width, isPortrait } = useDeviceOrientation()
   const appState = useAppStateListener()
   const isFocused = useIsFocused()

   const [screenWidth, setScreenWidth] = useState<number>(width)
   const [selectedRowViewModelIdx, setSelectedRowViewModelIdx] = useState<number>(0)
   const [rowViewModels, setRowViewModels] = useState<InboxRowViewModel[]>([])
   const [loading, setLoading] = useState<boolean>(true)
   const [animatedValue] = useState<any>(new Animated.Value(0))
   const [isMessageDisplay, setIsMessageDisplay] = useState<boolean>(false)
   
   const [visibleMessageImpressions, setVisibleMessageImpressions] = useState<InboxImpressionRowInfo[]>([])

   let {
      loadingScreen,
      container,
      headline,
      messageListContainer
   } = styles

   const navTitleHeight = headline.height + headline.paddingTop + headline.paddingBottom
   const updatedContainer = { ...container, width: 2 * width } //, height: height - navTitleHeight - 40 }
   //const messageListContainer = { width: width }

   headline = { ...headline, height: Platform.OS === "android" ? 70 : 60 }

   // headline = (isPortrait) ?
   //    { ...headline, marginTop: Platform.OS === "android" ? 0 : 40 } :
   //    { ...headline, paddingLeft: 65 }

   useEffect(() => {
      fetchInboxMessages()
      addInboxChangedListener()

      return () => {
         removeInboxChangedListener()
      }
   }, [])

   useEffect(() => {
      if(isFocused) {
         if(appState === 'active') {
            inboxDataModel.startSession(visibleMessageImpressions)
         } else if(appState === 'background' && Platform.OS === 'android' || appState === 'inactive') {
            inboxDataModel.endSession(visibleMessageImpressions)
         }
      }
   }, [appState])

   useEffect(() => {
      setScreenWidth(width)
      if (isMessageDisplay) {
         slideLeft()
      }
   }, [width])

   useEffect(() => {
      if(appState === 'active') {
         if(isFocused) {
            inboxDataModel.startSession(visibleMessageImpressions)
         } else {
            inboxDataModel.endSession(visibleMessageImpressions)
         }
      }
   }, [isFocused])

   useEffect(() => {
      inboxDataModel.updateVisibleRows(visibleMessageImpressions)
   }, [visibleMessageImpressions])

   useEffect(() => {
      if(isMessageDisplay) {
         returnToInbox()
      }
   }, [returnToInboxTrigger])

   function addInboxChangedListener() {
      RNEventEmitter.addListener(
         "receivedIterableInboxChanged",
         () => {
            fetchInboxMessages()
         }
      )
   }

   function removeInboxChangedListener() {
      RNEventEmitter.removeAllListeners("receivedIterableInboxChanged")
   }

   async function fetchInboxMessages() {
      let newMessages = await inboxDataModel.refresh()

      newMessages = newMessages.map((message, index) => {
         return { ...message, last: index === newMessages.length - 1 }
      })

      setRowViewModels(newMessages)
      setLoading(false)
   }

   function getHtmlContentForRow(id: string) {
      return inboxDataModel.getHtmlContentForMessageId(id)
   }

   // function handleMessageSelect(id: string, index: number, rowViewModels: InboxRowViewModel[]) {
   //    let newRowViewModels = rowViewModels.map((rowViewModel) => {
   //       return (rowViewModel.inAppMessage.messageId === id) ?
   //          { ...rowViewModel, read: true } : rowViewModel
   //    })
   //    setRowViewModels(newRowViewModels)
   //    inboxDataModel.setMessageAsRead(id)
   //    setSelectedRowViewModelIdx(index)

   //    Iterable.trackInAppOpen(rowViewModels[index].inAppMessage, IterableInAppLocation.inbox)

   //    Alert.alert(`${rowViewModels[index].inAppMessage.inboxMetadata.title} selected`)

   //    slideLeft()
   // }

   function deleteRow(messageId: string) {
      inboxDataModel.deleteItemById(messageId, IterableInAppDeleteSource.inboxSwipe)
      fetchInboxMessages()
   }

   function returnToInbox(callback?: Function) {
      Animated.timing(animatedValue, {
         toValue: 0,
         duration: 300,
         useNativeDriver: false
      }).start(() => typeof callback === 'function' && callback())
      setIsMessageDisplay(false)
   }

   function updateVisibleMessageImpressions(messageImpressions: InboxImpressionRowInfo[]) {
      setVisibleMessageImpressions(messageImpressions)
   }

   // function showMessageDisplay(rowViewModelList: InboxRowViewModel[], index: number) {
   //    const selectedRowViewModel = rowViewModelList[index]

   //    return (
   //       selectedRowViewModel ?
   //          <IterableInboxMessageDisplay
   //             rowViewModel={selectedRowViewModel}
   //             inAppContentPromise={getHtmlContentForRow(selectedRowViewModel.inAppMessage.messageId)}
   //             returnToInbox={(callback: Function) => returnToInbox(callback)}
   //             deleteRow={(messageId: string) => deleteRow(messageId)}
   //             contentWidth={width}
   //             isPortrait={isPortrait}
   //          /> : null
   //    )
   // }

   function showMessageList(loading: boolean) {
      return (
         <View style={messageListContainer}>
            <Text style={headline}>
               {customizations?.navTitle ? customizations?.navTitle : defaultInboxTitle}
            </Text>
            <TouchableOpacity
               style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'yellow',
                  width: width,
                  height: height - 60 - tabBarHeight
               }}
               activeOpacity={1}
               onPress={() => {
                  Alert.alert('Pressed!')
               }}
            >
               <Text>PRESS ME</Text>
            </TouchableOpacity>

            {/* {rowViewModels.length ?
               <IterableInboxMessageList
                  dataModel={inboxDataModel}
                  rowViewModels={rowViewModels}
                  customizations={customizations}
                  messageListItemLayout={messageListItemLayout}
                  deleteRow={(messageId: string) => deleteRow(messageId)}
                  handleMessageSelect={(messageId: string, index: number) => handleMessageSelect(messageId, index, rowViewModels)}
                  updateVisibleMessageImpressions={(messageImpressions: InboxImpressionRowInfo[]) => updateVisibleMessageImpressions(messageImpressions)}
                  contentWidth={width}
                  isPortrait={isPortrait}
               /> :
               renderEmptyState()
            } */}
         </View>)
   }

   function renderEmptyState() {
      return loading ?
         <View style={loadingScreen} /> :
         <IterableInboxEmptyState
            customizations={customizations}
            tabBarHeight={tabBarHeight}
            tabBarPadding={tabBarPadding}
            navTitleHeight={navTitleHeight}
            contentWidth={width}
            height={height}
            isPortrait={isPortrait}
         />
   }

   function slideLeft() {
      Animated.timing(animatedValue, {
         toValue: 1,
         duration: 300,
         useNativeDriver: false
      }).start()
      setIsMessageDisplay(true)
   }

   return(
      <SafeAreaView style={updatedContainer}>
         {showMessageList(loading)}
      </SafeAreaView>
   )
}

const styles = StyleSheet.create({
   loadingScreen: {
      height: '100%',
      backgroundColor: 'whitesmoke'
   },

   container: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      height: '100%',
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0
   },

   messageListContainer: {
      height: "100%",
      flexDirection: 'column',
      justifyContent: "flex-start",
   },

   headline: {
      fontWeight: 'bold',
      fontSize: 40,
      width: '100%',
      height: 60,
      marginTop: 0,
      paddingTop: 10,
      paddingBottom: 10,
      paddingLeft: 30,
      backgroundColor: 'whitesmoke'
   }
})

export default IterableInboxTest