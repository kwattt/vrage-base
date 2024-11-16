import { Server, createPlugin } from "@kwattt/vrage/server";

const myPlugin = createPlugin({
  name: 'myPlugin',
  version: '1.0.0',
  events: [{
    'event': 'v-onDatabaseLoad',
    'handler': () => {
      console.log('Database loaded from plugin in a plugin!');
    }
  }]
})

const server = Server.getInstance();
server.PluginManager.registerPlugin(myPlugin);