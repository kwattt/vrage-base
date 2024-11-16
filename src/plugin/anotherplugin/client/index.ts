import {Client} from 'vrage/client'
import { createPlugin } from 'vrage/client';

const client = new Client();

const plugin = createPlugin({
  name: 'chatty',
  version: '1.0.0',
})

client.PluginManager.registerPlugin(plugin);
