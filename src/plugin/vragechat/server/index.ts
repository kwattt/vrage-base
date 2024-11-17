import { Server } from "@kwattt/vrage/server";
const server = Server.getInstance();
const cmds = server.PluginManager.getPlugin('vrage-commands')

if(cmds){
  cmds.addCategory({
    name: 'chat',
    description: 'Chat commands'
  })

  cmds.addCommand({name: 'colorchat', description: 'enable/disable color chat',category: ['chat'],
    run(player){ player.call('v-chatcommand', ['colorchat']) } })
  
  cmds.addCommand({name: 'timestamp', description: 'enable/disable timestamp',category: ['chat'],
    run(player){ player.call('v-chatcommand', ['timestamp']) } })

  cmds.addCommand({name: 'solidchat', description: 'enable/disable solid chat',category: ['chat'],
    run(player){ player.call('v-chatcommand', ['solidchat']) } })

  cmds.addCommand({name: 'fontsize', description: 'change chat font size',category: ['chat'],
    run(player, size){ player.call('v-chatcommand', [`fontsize ${size}`]) } })

  cmds.addCommand({name: 'chatsize', description: 'change chat size',category: ['chat'],
    run(player, size){ player.call('v-chatcommand', [`chatsize ${size}`]) } })

  cmds.addCommand({name: 'autohide', description: 'enable/disable chat autohide',category: ['chat'],
    run(player){ player.call('v-chatcommand', ['autohide']) } })
}

mp.events.add('playerReady', (player) => {
  if(!cmds)
    return 
  
  const auto_complete = cmds.getCommandCompletions(player.v?.account?.admin || 0)
  player.call('c:chat::auto_complete', [JSON.stringify(auto_complete), 'en'])
})