import {Server} from '@kwattt/vrage/server';
import {defaultPlugins} from '@kwattt/vrage/server/baseplugins';
import dotenv from 'dotenv';
dotenv.config();

const server = Server.create({plugins: defaultPlugins})
server.Core.launch();

mp.events.add('v-onDatabaseLoad', () => {
  console.log('Database loaded');
})