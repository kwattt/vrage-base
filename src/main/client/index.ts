console.log('Hello, world FROM CLIENT!');

mp.events.add('vrage-inventory:setInventory', (data: any) => {
  mp.gui.chat.push(`Inventory set: ${JSON.stringify(data)}`)
})