import {createPlugin, Server} from '@kwattt/vrage/server';

const uselessHelper = {
  stuff(p: PlayerMp) {
    p.outputChatBox('Hello from useless plugin')
  }
}

export const uselessPlugin = createPlugin({
  name: 'useless',
  version: '1.0',

  otherFunc: () => {
    return mp.players.length
  },

  events: [{
    event: 'playerReady',
    handler: uselessHelper.stuff
  }]
})
Server.getInstance().PluginManager.registerPlugin(uselessPlugin)

declare global {
  interface VPlugins {
    'useless': typeof uselessPlugin
  } 
}