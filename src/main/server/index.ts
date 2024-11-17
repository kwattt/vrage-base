import {Server} from '@kwattt/vrage/server';
import {defaultPlugins} from '@kwattt/vrage/server/baseplugins';
import dotenv from 'dotenv';
import { uselessPlugin } from 'plugin/base/server';
dotenv.config();

const server = Server.create({plugins: defaultPlugins})
server.Core.launch();

mp.events.add('v-onDatabaseLoad', () => {
  console.log('Database loaded');
})

console.log('totalplayers', uselessPlugin.otherFunc());