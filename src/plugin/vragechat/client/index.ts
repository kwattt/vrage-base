mp.gui.chat.show(false);
export const chat = mp.browsers.new('package://cef/index.html');
chat.markAsChat();
chat.execute(`CEF.show('plugin_vragechat_Chat')`)

export let isChatOpen = false;
let chatVisible = true
let cefchatting = true

let cefTyping = false
export const isCefTyping = () => cefTyping
mp.events.add('cef::input_status', (input_status: boolean) => {
  if(input_status){
    if(cefchatting)
      mp.gui.chat.activate(false);
  }
  else if (cefchatting)
    mp.gui.chat.activate(true);
  cefTyping = input_status
})

let aiming_for_player = false

mp.events.add("player::chatOpen", (data: string) => {
  const {status} = JSON.parse(data)
  isChatOpen = status

  if(status){
    // lets check if player is aiming, 
    const aiming = mp.players.local.getIsTaskActive(4/*CTaskAimGunOnFoot*/)
    if(aiming && ! mp.players.local.vehicle){
      // make the player to keep aiming
      // get current player aiming pos
      
      const direction = mp.players.local.getForwardVector();
      let distance = 2
      const coords = mp.players.local.position
      const farAway1 = new mp.Vector3((direction.x * distance) + (coords.x), (direction.y * distance) + (coords.y), (direction.z * distance) + (coords.z));

      mp.players.local.taskAimGunAtCoord(farAway1.x, farAway1.y, farAway1.z+0.41, 900000, false, false);
      aiming_for_player = true
    }
  }
})

const controls_check = [
  1,2,232,233,234,235
]
mp.events.add('render', () => {
  if(aiming_for_player){
    for (let i = 0; i < controls_check.length; i++) {
      if(mp.game.controls.isControlJustPressed(0, controls_check[i])){
        aiming_for_player = false
        mp.players.local.clearTasks()
        break
      }
    }
  }
})

export const isChatVisible = () => chatVisible
export const toggleChatVisibility = () => {
  chatVisible = !chatVisible
  mp.gui.chat.show(chatVisible)
}

// load config from mp.storage
mp.events.add("playerReady", () => {
  let config = mp.storage.data.chat || undefined
  if(!config){
    mp.storage.data.chat = {
      timestamp: false,
      colorBackground: true,
      fontSize: 19,
      chatSize: 18,
      autohide: 5000
    }
  }
  config = mp.storage.data.chat

  chat.execute(`Chat.enableTimestamp(${config.timestamp})`)
  chat.execute(`Chat.enableColorBackground(${config.colorBackground})`)
  chat.execute(`Chat.fontSize(${config.fontSize})`)
  chat.execute(`Chat.chatSize(${config.chatSize})`)
  chat.execute(`Chat.enableAutohide(${config.autohide})`)
})

mp.events.add('v-chatcommand', (command: string) => {
  // toggleBackground
  if(command === 'colorchat'){
    const config = mp.storage.data.chat
    config.colorBackground = !config.colorBackground
    mp.storage.data.chat = config
    chat.execute(`Chat.enableColorBackground(${config.colorBackground})`)
  } else if(command === 'timestamp'){
    const config = mp.storage.data.chat
    config.timestamp = !config.timestamp
    mp.storage.data.chat = config
    chat.execute(`Chat.enableTimestamp(${config.timestamp})`)
  }
  else if (command === 'solidchat'){
    chat.execute(`Chat.enableSolidChat()`)
  } else if (command.startsWith('fontsize')){
    const size = parseInt(command.split(' ')[1])
    const config = mp.storage.data.chat
    if(config.fontSize === size) return
    if(!config.fontSize) config.fontSize = 19
    config.fontSize = size
    mp.storage.data.chat = config
    chat.execute(`Chat.fontSize(${size})`)
  } else if (command.startsWith('chatsize')){
    const size = parseInt(command.split(' ')[1])
    const config = mp.storage.data.chat

    if(config.chatSize === size) return

    if(!config.chatSize) config.chatSize = 18
    config.chatSize = size

    mp.storage.data.chat = config
    chat.execute(`Chat.chatSize(${size})`)
  } else if (command === 'autohide'){
    const config = mp.storage.data.chat
    if(config?.autohide === 0){
      chat.execute(`Chat.enableAutohide(5000)`)
      config.autohide = 5000
    } else {
      chat.execute(`Chat.enableAutohide(0)`)
      config.autohide = 0
    }
  } 
})

mp.events.add('c:chat::auto_complete', (data: string, lang: string) => {
  chat.execute(`chatSetCommands('${data}', '${lang}')`)
})

export const isCefChatting = () => !cefchatting
export const toggleChatInput = (value: boolean) => {
  cefchatting = value
  if(value) {
    mp.gui.chat.activate(true);
    chat.execute('Chat.activateChat(true)')
  }else{
    mp.gui.chat.activate(false);
    chat.execute('Chat.activateChat(false)')
  }
}
