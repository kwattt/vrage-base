// ChatBridge.ts
import { ChatSettings } from './types';

export class ChatBridge {
  private static instance: ChatBridge;
  private handlers: Map<string, Function>;

  private constructor() {
    this.handlers = new Map();
  }

  static getInstance(): ChatBridge {
    if (!ChatBridge.instance) {
      ChatBridge.instance = new ChatBridge();
    }
    return ChatBridge.instance;
  }

  setupGlobalChat(chatMethods: {
    setCommands: (commandsStr: string, lang: string) => void;
    clearMessages: () => void;
    activateChat: (toggle: boolean) => void;
    showChat: (toggle: boolean) => void;
    setFontSize: (size: number) => void;
    setChatSize: (size: number) => void;
    toggleSolidChat: () => void;
    setSettings: React.Dispatch<React.SetStateAction<ChatSettings>>;
    enableAutohide: (time: number) => void;
    enableColorBackground: (status: boolean) => void;
  }) {
    window.Chat = {
      setCommandsTest: () => chatMethods.setCommands('{"test": {"desc": "Test command", "args": [], "admin": 0}}', 'es'),
      enableTimestamp: (status) => chatMethods.setSettings(prev => ({ ...prev, timeStamp: status })),
      enableColorBackground: (status) => chatMethods.setSettings(prev => ({ ...prev, colorBackground: status })),
      fontSize: chatMethods.setFontSize,
      chatSize: chatMethods.setChatSize,
      enableSolidChat: chatMethods.toggleSolidChat,
      enableScrollbar: (status) => chatMethods.setSettings(prev => ({ ...prev, scrollbar: status })),
      enableCharacterCount: (status) => chatMethods.setSettings(prev => ({ ...prev, characterCount: status })),
      enableAutohide: (time) => chatMethods.setSettings(prev => ({ ...prev, autohide: time })),
      clearChat: chatMethods.clearMessages,
      showChat: chatMethods.showChat,
      activateChat: chatMethods.activateChat
    };

    window.chatSetCommands = (commandsStr: string, lang: string) => {
      console.log('Setting commands', commandsStr, lang);
      chatMethods.setCommands(commandsStr, lang);
    };
  }

  setupMPEvents(handlers: Record<string, (...args: any[]) => void>) {
    if (typeof mp !== 'undefined') {
      for (const [eventName, handler] of Object.entries(handlers)) {
        mp.events.add(eventName, handler);
        this.handlers.set(eventName, handler);
      }
    }
  }

  cleanup() {
    if (typeof mp !== 'undefined') {
      for (const eventName of this.handlers.keys()) {
        mp.events.remove(eventName);
      }
    }
    window.chatSetCommands = undefined;
    this.handlers.clear();
  }
}