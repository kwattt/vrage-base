import {Server} from 'vrage/server';
import dotenv from 'dotenv';
dotenv.config();

const server = new Server({plugins: []});
server.Core.launch();
