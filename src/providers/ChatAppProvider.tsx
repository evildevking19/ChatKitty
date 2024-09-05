import ChatKitty, {
  Channel,
  ChatKittyPaginator,
  ChatKittyUnsubscribe,
  ChatSession,
  CurrentUser,
  GetChannelsSucceededResult,
  GetCountSucceedResult,
  GetMessageParentSucceededResult,
  GetMessagesSucceededResult,
  GetUsersSucceededResult,
  isDirectChannel,
  JoinedChannelResult,
  LeftChannelResult,
  Message,
  Reaction,
  StartedChatSessionResult,
  succeeded,
  SystemSentMessageNotification,
  User,
} from 'chatkitty';
import React, { ReactElement, useEffect, useState } from 'react';
import {
  isTextMessageDraft,
  MessageDraft,
  MessageDraftType,
  TextMessageDraft,
} from 'react-chat-ui-kit';

import ChatKittyConfiguration from '../configuration/chatkitty';
import { LayoutState, View } from '../navigation';

const kitty = ChatKitty.getInstance(ChatKittyConfiguration.API_KEY);

interface ChatAppContext {
  login: (username: string) => void;
  currentUser: CurrentUser | null;
  online: boolean;
  replyMessage: Message | null;
  userFile: File | null;
  currentNotification: SystemSentMessageNotification | null;
  users: () => Promise<ChatKittyPaginator<User> | null>;
  getURLFile: (fileURL: string) => Promise<Blob | null>;
  joinedChannelsPaginator: () => Promise<ChatKittyPaginator<Channel> | null>;
  joinableChannelsPaginator: () => Promise<ChatKittyPaginator<Channel> | null>;
  joinChannel: (channel: Channel) => void;
  leaveChannel: (channel: Channel) => void;
  onJoinedChannel: (
    handler: (channel: Channel) => void
  ) => ChatKittyUnsubscribe;
  onLeftChannel: (handler: (channel: Channel) => void) => ChatKittyUnsubscribe;
  channelDisplayName: (channel: Channel) => string;
  channelDisplayPicture: (channel: Channel) => string | null;
  channelUnreadMessagesCount: (channel: Channel) => Promise<number>;
  messages: Message[];
  messagesPaginator: (
    channel: Channel
  ) => Promise<ChatKittyPaginator<Message> | null>;
  replyMessagesPaginator: (
    message: Message
  ) => Promise<ChatKittyPaginator<Message> | null>;
  getMessageParent: (message: Message) => Promise<Message | null>;

  memberListGetter: (Channel: Channel) => Promise<User[] | null>;
  reactToMessage: (emoji: string, message: Message) => Promise<Reaction | null>;
  removeReaction: (emoji: string, message: Message) => Promise<Reaction | null>;
  startChatSession: (
    channel: Channel,
    onReceivedMessage: (message: Message) => void,
    onTypingStarted: (user: User) => void,
    onTypingStopped: (user: User) => void
  ) => ChatSession | null;
  prependToMessages: (messages: Message[]) => void;
  appendToMessages: (messages: Message[]) => void;
  channel: Channel | null;
  messageDraft: TextMessageDraft;
  updateMessageDraft: (draft: TextMessageDraft) => void;
  discardMessageDraft: () => void;
  sendFileMessage: (file: File) => void;
  sendMessageDraft: (draft: MessageDraft) => void;
  loading: boolean;
  showMenu: () => void;
  hideMenu: () => void;
  changeReply: (message: Message) => void;
  cancelReply: () => void;
  setCurrentFile: (file: File) => void;
  clearFile: () => void;
  showChat: (channel: Channel) => void;
  updateMessages: (message: Message) => void;
  showJoinChannel: () => void;
  hideJoinChannel: () => void;
  layout: LayoutState;
  logout: () => void;
}

const initialValues: ChatAppContext = {
  login: () => {},
  currentUser: null,
  online: false,
  replyMessage: null,
  userFile: null,
  currentNotification: null,
  users: () => Promise.prototype,
  getURLFile: () => Promise.prototype,
  joinedChannelsPaginator: () => Promise.prototype,
  joinableChannelsPaginator: () => Promise.prototype,
  joinChannel: () => {},
  onJoinedChannel: () => () => {},
  leaveChannel: () => {},
  onLeftChannel: () => () => {},
  channelDisplayName: () => '',
  channelDisplayPicture: () => null,
  channelUnreadMessagesCount: () => Promise.prototype,
  startChatSession: () => null,
  messagesPaginator: () => Promise.prototype,
  replyMessagesPaginator: () => Promise.prototype,
  getMessageParent: () => Promise.prototype,
  memberListGetter: () => Promise.prototype,
  reactToMessage: () => Promise.prototype,
  removeReaction: () => Promise.prototype,
  prependToMessages: () => {},
  appendToMessages: () => {},
  channel: null,
  messages: [],
  messageDraft: {
    type: MessageDraftType.Text,
    text: '',
  },
  updateMessageDraft: () => {},
  discardMessageDraft: () => {},
  sendFileMessage: () => {},
  sendMessageDraft: () => {},
  loading: false,
  showMenu: () => {},
  hideMenu: () => {},
  changeReply: () => {},
  cancelReply: () => {},
  setCurrentFile: () => {},
  clearFile: () => {},
  showChat: () => {},
  updateMessages: () => {},
  showJoinChannel: () => {},
  hideJoinChannel: () => {},
  layout: { menu: false, chat: false, joinChannel: false },
  logout: () => {},
};

export const ChatAppContext = React.createContext(initialValues);

interface ChatAppContextProviderProps {
  children: ReactElement | JSX.Element[] | null;
}

const ChatAppContextProvider: React.FC<ChatAppContextProviderProps> = ({
  children,
}: ChatAppContextProviderProps) => {
  const [currentUser, setCurrentUser] = useState(initialValues.currentUser);
  const [online, setOnline] = useState(initialValues.online);
  const [channel, setChannel] = useState(initialValues.channel);
  const [messages, setMessages] = useState(initialValues.messages);
  const [messageDraft, setMessageDraft] = useState(initialValues.messageDraft);
  const [loading, setLoading] = useState(initialValues.loading);
  const [layout, setLayout] = useState(initialValues.layout);
  const [replyMessage, setReplyMessage] = useState<Message | null>(initialValues.replyMessage);
  const [userFile, setUserFile] = useState<File | null>(initialValues.userFile);

  const [currentNotification, setcurrentNotification] = useState<SystemSentMessageNotification | null>(initialValues.currentNotification);

  const views: Set<View> = new Set();

  const demoUsers = [
    'b2a6da08-88bf-4778-b993-7234e6d8a3ff',
    'c6f75947-af48-4893-a78e-0e0b9bd68580',
    'abc4264d-f1b1-41c0-b4cc-1e9daadfc893',
    '2989c53a-d0c5-4222-af8d-fbf7b0c74ec6',
    '8fadc920-f3e6-49ff-9398-1e58b3dc44dd',
  ];

  const getLayout = (): LayoutState => {
    return {
      menu: views.has('Menu'),
      chat: views.has('Chat'),
      joinChannel: views.has('Join Channel'),
    };
  };

  const showView = (view: View) => {
    views.add(view);

    setLayout(getLayout());
  };

  const hideView = (view: View) => {
    views.delete(view);

    setLayout(getLayout());
  };

  

  const changeReply = (message: Message) => {
    setReplyMessage(message);
  }

  const cancelReply = () => {
    setReplyMessage(initialValues.replyMessage);
  }

  const setCurrentFile = (file: File) => {
    setUserFile(file);
  }

  const clearFile = () => {
    setUserFile(initialValues.userFile);
  }

  const showMenu = () => {
    showView('Menu');
  };

  const hideMenu = () => {
    hideView('Menu');
  };

  const showChat = (c: Channel) => {
    if (c.id === channel?.id) {
      return;
    }

    hideView('Menu');

    setChannel(c);
    setMessages(initialValues.messages);

    showView('Chat');
  };

  const updateMessages = (message: Message) => {
    setMessages((old) =>
      old.map((item) => (item.id === message.id ? message : item))
    );
  };

  const hideChat = () => {
    setChannel(initialValues.channel);
    setMessages(initialValues.messages);

    hideView('Chat');
  };

  const showJoinChannel = () => {
    showView('Join Channel');
  };

  const hideJoinChannel = () => {
    hideView('Join Channel');
  };

  useEffect(() => {
    kitty.onCurrentUserChanged((user) => {
      setCurrentUser(user);
    });

    kitty.onCurrentUserOnline(() => {
      setOnline(true);
    });

    kitty.onCurrentUserOffline(() => {
      setOnline(false);
    });

    if(currentUser){
      kitty.onNotificationReceived((notification) => {
        setcurrentNotification(notification);
      })
    }

  }, [currentUser]);

  const login = async (username: string) => {
    setLoading(true);

    await kitty.startSession({
      username:
        username || demoUsers[Math.floor(Math.random() * demoUsers.length)],
    });

    setLoading(false);
  };

  const users = async () => {
    const result = await kitty.getUsers();

    if (succeeded<GetUsersSucceededResult>(result)) {
      return result.paginator;
    }

    return null;
  };

  const getURLFile = async (fileURL: string) => {
    try{
      const blobPromise = await fetch(fileURL).then(fileblob => fileblob.blob());
      return(blobPromise);
    }
    catch(error){
      console.log(error);
    }
    return(null);
  }

  const joinedChannelsPaginator = async () => {
    const result = await kitty.getChannels({
      filter: { joined: true },
    });

    if (succeeded<GetChannelsSucceededResult>(result)) {
      return result.paginator;
    }

    return null;
  };

  const joinableChannelsPaginator = async () => {
    const result = await kitty.getChannels({
      filter: { joined: false },
    });

    if (succeeded<GetChannelsSucceededResult>(result)) {
      return result.paginator;
    }

    return null;
  };

  const joinChannel = async (channel: Channel) => {
    const result = await kitty.joinChannel({ channel });

    if (succeeded<JoinedChannelResult>(result)) {
      hideView('Join Channel');

      showChat(result.channel);
    }
  };

  const leaveChannel = async (c: Channel) => {
    const result = await kitty.leaveChannel({ channel: c });

    if (
      succeeded<LeftChannelResult>(result) &&
      result.channel.id === channel?.id
    ) {
      hideChat();
    }
  };

  const onJoinedChannel = (handler: (channel: Channel) => void) => {
    return kitty.onChannelJoined(handler);
  };

  const onLeftChannel = (handler: (channel: Channel) => void) => {
    return kitty.onChannelLeft(handler);
  };

  

  const channelDisplayName = (channel: Channel): string => {
    if (isDirectChannel(channel)) {
      return channel.members
        .filter((member) => member.id !== currentUser?.id)
        .map((member) => member.displayName)
        .join(', ');
    }

    return channel.name;
  };

  const channelDisplayPicture = (channel: Channel): string | null => {
    if (isDirectChannel(channel) && channel.members.length === 2) {
      return channel.members
        .filter((member) => member.id !== currentUser?.id)
        .map((member) => member.displayPictureUrl)[0];
    }

    return null;
  };

  const startChatSession = (
    channel: Channel,
    onReceivedMessage: (message: Message) => void,
    onTypingStarted: (user: User) => void,
    onTypingStopped: (user: User) => void
  ): ChatSession | null => {
    const result = kitty.startChatSession({
      channel,
      onReceivedMessage,
      onTypingStarted,
      onTypingStopped,
      onMessageReactionAdded: (message) => {
        updateMessages(message);
      },
      onMessageReactionRemoved: (message) => {
        updateMessages(message);
      },
    });

    if (succeeded<StartedChatSessionResult>(result)) {
      return result.session;
    }

    return null;
  };

  const channelUnreadMessagesCount = async (channel: Channel) => {
    const result = await kitty.getUnreadMessagesCount({
      channel,
    });

    if (succeeded<GetCountSucceedResult>(result)) {
      return result.count;
    }

    return 0;
  };

  const messagesPaginator = async (channel: Channel) => {
    const result = await kitty.getMessages({
      channel,
    });

    if (succeeded<GetMessagesSucceededResult>(result)) {
      return result.paginator;
    }

    return null;
  };

  const replyMessagesPaginator = async (message: Message) => {
    const result = await kitty.getMessages({
      message,
    });

    if (succeeded<GetMessagesSucceededResult>(result)) {
      return result.paginator;
    }

    return null;
  };

  const getMessageParent = async (message: Message) => {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const test: any = message ;

    if(test.nestedLevel > 0){
      const result = await kitty.getMessageParent({
        message
      });
      
      if(succeeded<GetMessageParentSucceededResult>(result)){
        return result.message;
      }
    }
    

    return null;

  }

  const memberListGetter = async (channel: Channel) => {
    const result = await kitty.getChannelMembers({ channel: channel });

    if (succeeded<GetUsersSucceededResult>(result)) {
      return result.paginator.items;
    }

    return null;
  };


  const reactToMessage = async (emoji: string, message: Message) => {
    const result = await kitty.reactToMessage({ emoji, message });

    if (succeeded(result)) {
      return result.reaction;
    }

    return null;
  };

  const removeReaction = async (emoji: string, message: Message) => {
    const result = await kitty.removeReaction({ emoji, message });

    if (succeeded(result)) {
      return result.reaction;
    }

    return null;
  };

  const prependToMessages = (items: Message[]) => {
    setMessages((old) => [...items, ...old]);
  };

  const appendToMessages = (items: Message[]) => {
    setMessages((old) => [...old, ...items]);
  };

  const updateMessageDraft = async (draft: TextMessageDraft) => {
    if (!channel) {
      return;
    }

    await kitty.sendKeystrokes({ channel, keys: draft.text });

    setMessageDraft(draft);
  };

  const discardMessageDraft = () => {
    setMessageDraft(initialValues.messageDraft);
  };


  const sendFileMessage = async (file: File) => {
    if (!channel) {
      return;
    }
    await kitty.sendMessage({
      channel,
      file,
    });
    
  }


  const sendMessageDraft = async (draft: MessageDraft) => {
    if (!channel) {
      return;
    }

    if (isTextMessageDraft(draft)) {
      if(userFile){
        if(replyMessage){
          await kitty.sendMessage({
            body: draft.text,
            message: replyMessage,
            file: userFile,
          });
        }else{
          await kitty.sendMessage({
            channel: channel,
            body: draft.text,
            file: userFile,
          });
        }
      }
      else{
        if(replyMessage){
          await kitty.sendMessage({
            body: draft.text,
            message: replyMessage,
          });
        }else{
          await kitty.sendMessage({
            channel: channel,
            body: draft.text,
          });
        }

      }
      
      clearFile();
      discardMessageDraft();
      setReplyMessage(initialValues.replyMessage);
    }
    
  };

  const logout = async () => {
    await kitty.endSession();
  };

  return (
    <ChatAppContext.Provider
      value={{
        showMenu,
        hideMenu,
        changeReply,
        cancelReply,
        setCurrentFile,
        clearFile,
        showChat,
        updateMessages,
        showJoinChannel,
        hideJoinChannel,
        currentUser,
        online,
        replyMessage,
        userFile,
        currentNotification,
        users,
        getURLFile,
        joinedChannelsPaginator,
        joinableChannelsPaginator,
        joinChannel,
        onJoinedChannel,
        onLeftChannel,
        leaveChannel,
        channelDisplayName,
        channelDisplayPicture,
        channelUnreadMessagesCount,
        startChatSession,
        messagesPaginator,
        replyMessagesPaginator,
        getMessageParent,
        memberListGetter,
        reactToMessage,
        removeReaction,
        prependToMessages,
        appendToMessages,
        messageDraft,
        updateMessageDraft,
        discardMessageDraft,
        sendFileMessage,
        sendMessageDraft,
        channel,
        messages,
        loading,
        layout,
        login,
        logout,
      }}
    >
      {children}
    </ChatAppContext.Provider>
  );
};

export default ChatAppContextProvider;
