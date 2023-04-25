import React, { useEffect, useState, useRef } from 'react';
import { httpCall } from '../../common/components/Http';
import { useDidMountEffect, useObserver } from '../../common/hooks';
import {
  UiList,
  UiListItem,
  OpfText,
  OpfSpacer,
  OpfGrid,
  OpfGridItem,
} from '@absis-components/react';
import PropTypes from 'prop-types';
import MessageComponent from './MessageComponent/MessageComponent';
import { isSameDay, checkDate } from '../../common/components/DateManager';

const MessageListComponent = props => {
  const { wallId, conversationId } = props;
  const [observer, setElement, entries] = useObserver({
    threshold: 0.9,
    root: null,
  });

  const [mensajesList, setMensajesList] = useState([]);
  const [firstMessage, setFirstMessage] = useState();
  const [
    listContainerHeightBeforeUpdate,
    setListContainerHeightBeforeUpdate,
  ] = useState();

  const page = useRef(0);
  const lastMessageRef = useRef();
  const firstMessageRef = useRef();
  const listContainer = useRef();
  const sidePanel = useRef();

  // Load side panel to handle chat scroll position when needed
  useEffect(() => {
    sidePanel.current =
      document && document.querySelector('#conversationSidePanel');
    if (!sidePanel.current) return; // exit early if element doesn't exist

    const shadowRoot = sidePanel.current.shadowRoot;
    if (!shadowRoot) return; // exit early if shadowRoot doesn't exist

    const sidePanelElement = shadowRoot.querySelector(
      'div:nth-child(1) > div:nth-child(2) > div:nth-child(4)'
    );

    // update sidePanel.current only if sidePanelElement exists
    if (sidePanelElement) sidePanel.current = sidePanelElement;
  }, []);

  // Return to last scroll position on messages list update
  const handleTopScroll = () => {
    if (sidePanel.current) {
      sidePanel.current.scrollTop = !listContainerHeightBeforeUpdate
        ? listContainer.current.clientHeight
        : listContainer.current.clientHeight - listContainerHeightBeforeUpdate;
    }
  };

  // Execute HTTP call when component is mount.
  useEffect(() => {
    httpCall(
      'messages',
      { wallId: wallId, conversationId: conversationId },
      { pageKey: page.current, pageSize: 10, isMessagesDetail: true },
      response => {
        if (response.data && response.data.conversation) {
          setMensajesList(() => {
            response.data.conversation.messages?.reverse();
            return response.data;
          });
        }
        setFirstMessage(firstMessageRef.current);
      }
    );
  }, []);

  // Scroll to the most recent message on load or new message send.
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastMessageRef.current) {
        lastMessageRef.current.scrollIntoView({ smooth: true });
        clearInterval(interval);
      }
    }, 100);
  }, [lastMessageRef.current]);

  // Get more pages on scroll and update conversation list
  const getMoreMessagePagesOnScroll = () => {
    page.current++;
    httpCall(
      'messages',
      { wallId: wallId, conversationId: conversationId },
      { pageKey: page.current, pageSize: 10, isMessagesDetail: true },
      response => {
        updateListOnScroll(response);
        setFirstMessage(firstMessageRef.current);
      }
    );
  };

  /**
   * Update Conversation List when scrolling down.
   *
   * @param response
   */
  const updateListOnScroll = response => {
    const newMensajesList = response.data;
    newMensajesList.conversation.messages = [
      ...response.data.conversation.messages.reverse(),
      ...mensajesList.conversation.messages,
    ];
    setMensajesList(newMensajesList);
  };

  // Update last conversation.
  useDidMountEffect(() => {
    if (firstMessage) setTimeout(() => setElement(firstMessage), 500);
  }, [setElement, firstMessage]);

  // Watch if last conversation is intersecting.
  useDidMountEffect(() => {
    if (
      entries[0]?.isIntersecting &&
      page.current < mensajesList.pagination.total - 1
    ) {
      setListContainerHeightBeforeUpdate(listContainer.current.clientHeight);
      handleTopScroll();
      getMoreMessagePagesOnScroll();
    }
  }, [observer, entries]);

  const displayDay = creationDate => {
    return (
      <div>
        <OpfGrid justifyContent="center" columns={2}>
          <OpfGridItem b-100="2">
            <OpfText align="center" color="primary" variant="detail-1">
              {checkDate(creationDate)}
            </OpfText>
          </OpfGridItem>
        </OpfGrid>
        <OpfSpacer break="small" />
      </div>
    );
  };

  return (
    <div className="col-md-12" ref={listContainer}>
      <UiList>
        <UiListItem key={conversationId}>
          <br />
          {mensajesList?.conversation?.messages?.map((message, index) => {
            const isLastMessage =
              mensajesList.conversation.messages.length - 1 === index;
            const isFirstMessage = index === 0;
            const sameDay = () => {
              if (index > 0) {
                return isSameDay(
                  message.creationDate,
                  mensajesList.conversation.messages[index - 1].creationDate
                );
              }
            };

            return (
              <div
                key={index /* message.messageId */}
                ref={
                  isLastMessage
                    ? lastMessageRef
                    : isFirstMessage
                    ? firstMessageRef
                    : null
                }
              >
                {!sameDay() && displayDay(message.creationDate)}
                <MessageComponent message={message} />
              </div>
            );
          })}
        </UiListItem>
      </UiList>
    </div>
  );
};

MessageListComponent.propTypes = {
  wallId: PropTypes.string,
  conversationId: PropTypes.string,
};

export default MessageListComponent;
