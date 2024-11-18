// types.ts

export interface ChatSettings {
  timeStamp: boolean;
  removeInputColors: boolean;
  characterCount: boolean;
  scrollbar: boolean;
  maxLength: number;
  colorBackground: boolean;
  solidchat: boolean;
  autohide: number;
}

export interface ChatMessage {
  text: string;
  timestamp: string;
  colorClass: string;
}

export interface ChatCommand {
  desc: string | Record<string, string>;
  args: string[];
  admin: number;
}

export interface ChatCommands {
  [key: string]: ChatCommand;
}

declare global {
  interface Window {
    Chat?: {
      setCommandsTest: (commandStr: string, lang: string) => void;
      enableTimestamp: (status: boolean) => void;
      enableColorBackground: (status: boolean) => void;
      fontSize: (size: number) => void;
      chatSize: (size: number) => void;
      enableSolidChat: (status: boolean) => void;
      enableScrollbar: (status: boolean) => void;
      enableCharacterCount: (status: boolean) => void;
      enableAutohide: (time: number) => void;
      clearChat: () => void;
      showChat: (status: boolean) => void;
      activateChat: (status: boolean) => void;
    };
    chatSetCommands?: (commandsStr: string, lang: string) => void;
  }
}