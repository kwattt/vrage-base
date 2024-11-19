import {VRage, Server} from '@kwattt/vrage/server';
import { commandPlugin } from '@kwattt/vrage/server/plugins/command';
import {chatPlugin} from '@kwattt/vrage/server/plugins/chat';
import {ServerRPC} from '@kwattt/vrage/server/rpc'

ServerRPC.init()

import dotenv from 'dotenv';
dotenv.config();

Server.configure({
  plugins: [commandPlugin, chatPlugin],
})
VRage.Core.launch()