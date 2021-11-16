'use strict'

import React, { useCallback, useState } from 'react'
import { ViewabilityConfig, ViewToken, FlatList } from 'react-native'

import {
   InboxRowViewModel,
   IterableInboxCustomizations,
   IterableInboxDataModel,
   IterableInboxMessageCell
} from '.'

type MessageListProps = {
   dataModel: IterableInboxDataModel,
   rowViewModels: InboxRowViewModel[],
   customizations: IterableInboxCustomizations,
   messageListItemLayout: Function,
   deleteRow: Function,
   handleMessageSelect: Function,
   contentWidth: number,
   isPortrait: boolean
}

const IterableInboxMessageList = ({
   dataModel,
   rowViewModels,
   customizations,
   messageListItemLayout,
   deleteRow,
   handleMessageSelect,
   contentWidth,
   isPortrait
}: MessageListProps) => {
   const [swiping, setSwiping] = useState<boolean>(false)

   function renderRowViewModel(rowViewModel: InboxRowViewModel, index: number, last: boolean) {
      return (
         <IterableInboxMessageCell
            key={rowViewModel.inAppMessage.messageId}
            dataModel={dataModel}
            index={index}
            last={last}
            rowViewModel={rowViewModel}
            customizations={customizations}
            swipingCheck={(swiping: boolean) => setSwiping(swiping)}
            messageListItemLayout={messageListItemLayout}
            deleteRow={(messageId: string) => deleteRow(messageId)}
            handleMessageSelect={(messageId: string, index: number) => handleMessageSelect(messageId, index)}
            contentWidth={contentWidth}
            isPortrait={isPortrait}
         />
      )
   }

   const inboxSessionViewabilityConfig: ViewabilityConfig = {
      minimumViewTime: 0.5,
      itemVisiblePercentThreshold: 50,
      waitForInteraction: true
   }

   const inboxSessionItemsChanged = useCallback((
      (info: { viewableItems: Array<ViewToken>, changed: Array<ViewToken> }) => {

      }
   ), [])

   return (
      <FlatList
         scrollEnabled={!swiping}
         data={rowViewModels}
         renderItem={({ item, index }: { item: InboxRowViewModel, index: number }) => renderRowViewModel(item, index, index === rowViewModels.length - 1)}
         keyExtractor={(item: InboxRowViewModel) => item.inAppMessage.messageId}
         viewabilityConfig={inboxSessionViewabilityConfig}
         onViewableItemsChanged={inboxSessionItemsChanged}
      />
   )
}

export default IterableInboxMessageList