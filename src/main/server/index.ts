import {VRage, Server} from '@kwattt/vrage/server';
import { commandPlugin as cmd, defaultPlugins, inventoryPlugin } from '@kwattt/vrage/server/baseplugins';
import dotenv from 'dotenv';
dotenv.config();

Server.configure({
  plugins: [...defaultPlugins, inventoryPlugin]
})
VRage.Core.launch()

inventoryPlugin.itemPool.add({
  name: 'apple',
  'hashmodel': 'apple',
  'maxAmount': 5,
  'weight': 1,
  sprites: ['apple', 'applita', 'goodapple', 'wawis', 'lowawis', 'lewaros'],
  hashname: 'apple',  
})

cmd.addCommand({
  name: 'testinventory',
  run: (player) => {
    const veh = mp.vehicles.new(mp.joaat('adder'), player.position, {
      numberPlate: 'VRAGE',
      color: [[255, 0, 0], [0, 255, 0]]
    })
    veh.v.inv.addInventory('base', 15, 130)
    veh.v.inv.inventories?.base.addItem('apple',
      Math.floor(Math.random() * 5)
    )
    player.outputChatBox(`vehicle created, id: ${veh.id}`)
    player.outputChatBox(`Vehicle inventory: ${JSON.stringify(veh.v.inv.inventories?.base.items)}`)
  }
})

cmd.addCommand({
  name: 'viewinvetory',
  run: (p: PlayerMp, _: string, id: string) => {
    const veh = mp.vehicles.at(parseInt(id))
    if(!veh) return p.outputChatBox('Vehicle not found')
    if(!veh.v.inv.inventories?.base) return p.outputChatBox('No inventory')

    p.outputChatBox(`Vehicle inventory: ${JSON.stringify(veh.v.inv.inventories?.base.items)}`)
  }
})

cmd.addCommand({
  name: 'inv',
  run: (player) => {
    if(!player.v.inv.inventories?.base) 
      return player.outputChatBox('No inventory')
    
    if(!player.v.hasInventoryOpen(player.v.inv.inventories.base))
    {
      player.outputChatBox('Opening inventory')
      player.v.openInventory('My inventory', player.v.inv.inventories.base, true)
    } else {
      player.outputChatBox('Closing inventory')
      player.v.closeInventory(player.v.inv.inventories.base)
    }
  }
})


mp.events.add('v-onDatabaseLoad', () => {
  console.log('Database loaded');
})

mp.events.add('playerReady', (player) => {
  player.v.inv.addInventory('base', 15, 130)
})