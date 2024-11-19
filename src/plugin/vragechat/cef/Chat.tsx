import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatSettings, ChatMessage, ChatCommands } from './types';
import { ChatBridge } from './chatbridge';
import './main.css'

import {CefRPC} from '@kwattt/vrage/cef/rpc'
CefRPC.init()

const ChatApp: React.FC = () => {
  // State
  const [settings, setSettings] = useState<ChatSettings>({
    timeStamp: true,
    removeInputColors: true,
    characterCount: true,
    scrollbar: true,
    maxLength: 255,
    colorBackground: false,
    solidchat: false,
    autohide: 0
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [chatInputStatus, setChatInputStatus] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isHidden, setIsHidden] = useState(false);
  const [chatActive, setChatActive] = useState(true);
  const [showScrollbar, setShowScrollbar] = useState(true);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [inputHistoryPosition, setInputHistoryPosition] = useState(-1);
  const [inputCache, setInputCache] = useState('');
  const [commands, setCommands] = useState<ChatCommands>({});
  const [commandNames, setCommandNames] = useState<string[]>([]);
  const [completeWord, setCompleteWord] = useState('');
  const [lang, setLang] = useState('es');
  const [chatSize, setChatSize] = useState(18);
  const [autoCompleteHtml, setAutoCompleteHtml] = useState('');

  // Refs
  const messageListRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const hideScrollbarTimerRef = useRef<number | null>(null);
  const hideChatTimerRef = useRef<number | null>(null);
  const chatBridgeRef = useRef<ChatBridge>(ChatBridge.getInstance());

  // Utility functions
  const getDateString = useCallback(() => {
    const date = new Date();
    const h = '0' + date.getHours().toString();
    const m = '0' + date.getMinutes().toString();
    const s = '0' + date.getSeconds().toString();
    return `[${h.substr(h.length-2)}:${m.substr(m.length-2)}:${s.substr(s.length-2)}] `;
  }, []);

  const levenshteinDistance = useCallback((str1: string, str2: string): number => {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) {
      for (let j = 0; j <= n; j++) {
        if (i === 0) dp[i][j] = j;
        else if (j === 0) dp[i][j] = i;
        else {
          dp[i][j] = Math.min(
            dp[i - 1][j - 1] + (str1[i - 1] === str2[j - 1] ? 0 : 1),
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1
          );
        }
      }
    }
    return dp[m][n];
  }, []);

  const findSimilarWords = useCallback((word: string, list: string[]): string[] => {
    const suggestions = list
      .filter(comando => comando.includes(word))
      .map(comando => ({
        comando,
        distancia: levenshteinDistance(word, comando)
      }))
      .sort((a, b) => a.distancia - b.distancia)
      .slice(0, 5)
      .map(s => s.comando);
    
    return suggestions;
  }, [levenshteinDistance]);

  const getCommandDescription = useCallback((command: any): string => {
    if (!command) return '~~~';
    if (typeof command.desc === 'object') {
      return command.desc[lang] || command.desc['~~~'];
    }
    return typeof command.desc === 'string' ? command.desc : '~~~';
  }, [lang]);

  // Core chat functions
  const handleChatInputStatus = useCallback((status: boolean) => {
    if ((!chatActive && status) || (status === chatInputStatus)) return;

    if (typeof mp !== 'undefined') {
      mp.invoke("focus", status);
      mp.invoke("setTypingInChatState", status);
      mp.trigger("player::chatOpen", JSON.stringify({status}));
    }

    setChatInputStatus(status);
    
    if (status) {
      if (settings.scrollbar) {
        setShowScrollbar(true);
        if (hideScrollbarTimerRef.current) {
          clearTimeout(hideScrollbarTimerRef.current);
        }
        hideScrollbarTimerRef.current = setTimeout(() => {
          setShowScrollbar(false);
        }, 10000);
      }
      // Remove the direct focus call from here as it might be too early
    } else {
      setAutoCompleteHtml('');
    }
  }, [chatActive, chatInputStatus, settings.scrollbar]);

  const updateCharCount = useCallback((message: string) => {
    message = message.trim();
    if (message.startsWith('/') && message.length >= 2) {
      const similarWords = findSimilarWords(message.substr(1).toLowerCase(), commandNames);
      if (similarWords.length > 0) {
        const mostSimilar = commands[similarWords[0]];
        const desc = getCommandDescription(mostSimilar);
        
        let html = `<b>/${similarWords[0]} 
          ${mostSimilar.args?.length > 0 ? `[${mostSimilar.args.join(' ')}]` : ''} 
          ${mostSimilar.admin > 0 ? `(ADM: ${mostSimilar.admin})` : ''} - ${desc}</b>`;

        const notSoSimilar = similarWords.slice(1);
        html += notSoSimilar.map((word) => {
          const command = commands[word];
          const desc = getCommandDescription(command);
          return `<br>/${word} - ${desc}`;
        }).join('');

        setAutoCompleteHtml(html);
        setCompleteWord(similarWords[0]);
      }
    } else {
      setAutoCompleteHtml('');
      setCompleteWord('');
    }
  }, [commands, commandNames, findSimilarWords, getCommandDescription]);


  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      // Use requestAnimationFrame to ensure the scroll happens after the render
      requestAnimationFrame(() => {
        if (messageListRef.current) {
          messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
      });
    }
  }, []);

  const pushMessage = useCallback((text: string) => {
    let colorClass = '';
    let processedText = text;

    switch(text[0]) {
      case '0':
        processedText = text.substr(1);
        colorClass = 'color-purple';
        break;
      case '1':
        processedText = text.substr(1);
        if (settings.colorBackground) {
          processedText = `🚩 ${processedText}`;
        }
        colorClass = 'color-error';
        break;
    }

    if (!settings.colorBackground) {
      colorClass += ' hide3';
    }

    setMessages(prev => {
      const newMessages = [...prev, {
        text: processedText,
        timestamp: getDateString(),
        colorClass
      }];
      if (newMessages.length > 100) {
        return newMessages.slice(-100);
      }
      return newMessages;
    });

    // Schedule scroll after state update
    setTimeout(scrollToBottom, 0);

    if (settings.scrollbar) {
      setShowScrollbar(true);
      if (hideScrollbarTimerRef.current) {
        clearTimeout(hideScrollbarTimerRef.current);
      }
      hideScrollbarTimerRef.current = setTimeout(() => {
        setShowScrollbar(false);
      }, 8000);
    }

    if (settings.autohide > 0) {
      if (hideChatTimerRef.current) {
        clearTimeout(hideChatTimerRef.current);
      }

      if (!isHidden) {
        setIsHidden(false);
        hideChatTimerRef.current = setTimeout(() => {
          setIsHidden(true);
        }, settings.autohide);
      } else {
        setIsHidden(false);
      }
    } else if (isHidden)
      setIsHidden(false);

  }, [settings, getDateString, isHidden, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendInput = useCallback(() => {
    let message = inputText.trim();

    if (settings.removeInputColors) {
      message = message.replace(/(?=!{).*(?<=})/g, '');
    }

    if (message.length < 1) {
      handleChatInputStatus(false);
      return;
    }

    if (message[0] === '/') {
      if (message.length < 2) {
        handleChatInputStatus(false);
        return;
      }
      if (typeof mp !== 'undefined') {
        mp.invoke('command', message.substr(1));
      } else {
        pushMessage(message);
      }
    } else {
      if (typeof mp !== 'undefined') {
        mp.invoke('chatMessage', message);
      } else {
        pushMessage(`${message}`);
      }
    }

    setInputHistory(prev => [message, ...prev.slice(0, 99)]);
    setInputText('');
    setInputHistoryPosition(-1);
    handleChatInputStatus(false);
  }, [inputText, settings.removeInputColors, handleChatInputStatus, pushMessage]);

  const onArrowUp = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault();
    if (inputHistoryPosition === inputHistory.length - 1) return;
    
    if (inputHistoryPosition === -1) {
      setInputCache(inputText);
    }

    const newPosition = inputHistoryPosition + 1;
    setInputHistoryPosition(newPosition);
    setInputText(inputHistory[newPosition]);
  }, [inputHistoryPosition, inputHistory, inputText]);

  const onArrowDown = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault();
    if (inputHistoryPosition === -1) return;

    if (inputHistoryPosition === 0) {
      setInputText(inputCache);
      setInputHistoryPosition(-1);
      return;
    }

    const newPosition = inputHistoryPosition - 1;
    setInputHistoryPosition(newPosition);
    setInputText(inputHistory[newPosition]);
  }, [inputHistoryPosition, inputCache, inputHistory]);

  const handleTabComplete = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault();
    if (completeWord.length > 0) {
      setInputText(`/${completeWord}`);
      setCompleteWord('');
    }
  }, [completeWord]);

  // Chat management functions
  const chatManagement = {
    clearMessages: useCallback(() => {
      setMessages([]);
    }, []),

    activateChat: useCallback((toggle: boolean) => {
      if (!toggle && chatActive) {
        handleChatInputStatus(false);
      }
      setChatActive(toggle);
    }, [chatActive, handleChatInputStatus]),

    showChat: useCallback((toggle: boolean) => {
      if (!toggle && chatInputStatus) {
        handleChatInputStatus(false);
      }
      setIsHidden(!toggle);
      setIsVisible(toggle);
      setChatActive(toggle);
    }, [chatInputStatus, handleChatInputStatus]),

    setFontSize: useCallback((size: number) => {
      const element = document.getElementById('chatbox');
      if (element) {
        element.style.fontSize = `${size}px`;
      }
    }, []),

    enableAutohide: useCallback((time: number) => {
      setSettings(prev => ({ ...prev, autohide: time }));
    }, []),

    enableColorBackground: useCallback((status: boolean) => {
      setSettings(prev => ({ ...prev, colorBackground: status }));
    }, []),

    setCommandsAndLang: useCallback((commandsStr: string, lang: string) => {
      const parsedCommands = JSON.parse(commandsStr);
      setCommands(parsedCommands);
      setCommandNames(Object.keys(parsedCommands));
      setLang(lang);
    }, []),

    toggleSolidChat: useCallback(() => {
      setSettings(prev => ({ ...prev, solidchat: !prev.solidchat }));
    }, [])
  };

  // Handle keydown events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle 't' key if we're not already typing in an input
    if (e.key.toLowerCase() === 't' && 
        !chatInputStatus && 
        chatActive && 
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
      handleChatInputStatus(true);
      e.preventDefault();
    }
  }, [chatInputStatus, chatActive, handleChatInputStatus]);

  // Setup and cleanup effects
  useEffect(() => {
    const bridge = chatBridgeRef.current;

    // Setup global chat methods
    bridge.setupGlobalChat({
      setCommands: chatManagement.setCommandsAndLang,
      clearMessages: chatManagement.clearMessages,
      activateChat: chatManagement.activateChat,
      showChat: chatManagement.showChat,
      setFontSize: chatManagement.setFontSize,
      setChatSize,
      toggleSolidChat: chatManagement.toggleSolidChat,
      setSettings,
      enableAutohide: chatManagement.enableAutohide,
      enableColorBackground: chatManagement.enableColorBackground
    });

    // Setup MP events
    bridge.setupMPEvents({
      'chat:push': pushMessage,
      'chat:clear': chatManagement.clearMessages,
      'chat:activate': chatManagement.activateChat,
      'chat:show': chatManagement.showChat,
      'chat:solidchat': chatManagement.toggleSolidChat,
      'chat:fontSize': chatManagement.setFontSize,
      'chat:chatSize': setChatSize,
    });

    // Add keydown listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Initial message
    pushMessage('Chat iniciado');

    return () => {
      bridge.cleanup();
      window.removeEventListener('keydown', handleKeyDown);
      
      if (hideScrollbarTimerRef.current) {
        clearTimeout(hideScrollbarTimerRef.current);
      }
      if (hideChatTimerRef.current) {
        clearTimeout(hideChatTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (chatInputStatus) {
      // Use a small delay to ensure the input has rendered
      const focusTimer = setTimeout(() => {
        chatInputRef.current?.focus();
      }, 0);
      
      return () => clearTimeout(focusTimer);
    } 

    return 
  }, [chatInputStatus]);

  return (
    <div 
      id="chatbox"
      className={`chatBox ${!isVisible ? 'hide' : ''}`}
      tabIndex={-1}
    >

      <div
        id="messageslist"
        className={`messageList ${settings.scrollbar && showScrollbar ? 'scrollbar' : ''}`}
        ref={messageListRef}
        style={{
          display:(isHidden && settings.autohide > 0) ? 'none' : 'block',
          height: `${chatSize}em`,
          overflowY: showScrollbar ? 'auto' : 'hidden'
        }}
        tabIndex={-1}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message stroke ${message.colorClass} ${settings.solidchat ? 'solidchat' : ''}`}
          >
            <span 
              className={`timeStamp ${!settings.timeStamp ? 'hide2' : ''}`}
              dangerouslySetInnerHTML={{ __html: message.timestamp }}
            />
            <span dangerouslySetInnerHTML={{ __html: message.text }} />
          </div>
        ))}
      </div>

      {chatInputStatus && (
        <input
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            updateCharCount(e.target.value);
          }}
          onKeyDown={(e) => {
            switch (e.key) {
              case 'Enter':
                sendInput();
                break;
              case 'Escape':
                handleChatInputStatus(false);
                break;
              case 'ArrowUp':
                onArrowUp(e);
                break;
              case 'ArrowDown':
                onArrowDown(e);
                break;
              case 'Tab':
                handleTabComplete(e);
                break;
            }
          }}
          maxLength={settings.maxLength}
          className="inputBar"
          placeholder="Type a message..."
          ref={chatInputRef}
        />
      )}

      <img src={CEF.getStaticPath('vragechat', 'step3.jpg')} alt="Chat" className="chatIcon" />
      <div
        id="autoComplete"
        dangerouslySetInnerHTML={{ __html: autoCompleteHtml }}
        tabIndex={-1}
      />

      <span
        id="charCount"
        className={`${!chatInputStatus ? 'hide' : ''} ${chatInputStatus ? 'charCount stroke' : ''}`}
        tabIndex={-1}
      >
        {inputText.length}/{settings.maxLength}
      </span>
    </div>
  );
};

export default ChatApp;