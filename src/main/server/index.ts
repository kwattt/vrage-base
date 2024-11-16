import {Server} from 'vrage/server';
import {defaultPlugins} from 'vrage/server/baseplugins';
import dotenv from 'dotenv';
dotenv.config();

const server = new Server({plugins: defaultPlugins});
server.Core.launch();
