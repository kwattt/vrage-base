<template>
    <div id="chatbox" class="chatBox" :class="{ hide: !isVisible }" tabindex="-1">
      <div id="messageslist" 
         class="messageList" 
         :class="{ scrollbar: settings.scrollbar && !isHidden }" 
         ref="messageList"
         :style="{ height: `${chatSize}em`, overflowY: showScrollbar ? 'auto' : 'hidden' }"
         tabindex="-1">
      <div v-for="(message, index) in messages" 
           :key="index" 
           class="message stroke"
           :class="[message.colorClass, { solidchat: settings.solidchat }]">
        <!-- Use v-html for the message content -->
        <span class="timeStamp" 
              :class="{ 'hide2': !settings.timeStamp }" 
              v-html="message.timestamp"></span>
        <span v-html="message.text"> </span>
      </div>
    </div>
  
      <input v-if="chatInputStatus"
             v-model="inputText"
             @input="updateCharCount"
             @keydown.enter="sendInput"
             @keydown.esc="setChatInputStatus(false)"
             @keydown.up.prevent="onArrowUp"
             @keydown.down.prevent="onArrowDown"
             @keydown.tab.prevent="handleTabComplete"
             :maxlength="settings.maxLength"
             class="inputBar"
             placeholder="Type a message..."
             ref="chatInput" />
  
      <div id="autoComplete" 
           v-html="autoCompleteHtml"
           tabindex="-1">
      </div>
  
      <span id="charCount" 
            :class="{ 'hide': !chatInputStatus, 'charCount stroke': chatInputStatus }"
            tabindex="-1">
        {{ inputText.length }}/{{ settings.maxLength }}
      </span>
    </div>
  </template>
  
  <script>
  export default {
    name: 'ChatApp',
    data() {
      return {
        settings: {
          timeStamp: true,
          removeInputColors: true,
          characterCount: true,
          scrollbar: true,
          maxLength: 255,
          colorBackground: false,
          solidchat: false,
          autohide: 5000
        },
        messages: [],
        inputText: '',
        chatInputStatus: false,
        isVisible: true,
        isHidden: false,
        chatActive: true,
        showScrollbar: true,
        inputHistory: [],
        inputHistoryPosition: -1,
        inputCache: '',
        commands: {},
        command_names: [],
        complete_word: '',
        lang: 'es',
        chatSize: 18,
        autoCompleteHtml: '',
        hideScrollbarTimer: null,
        hideChatTimer: null
      }
    },
    methods: {
      getDateString() {
        const date = new Date()
        const h = '0' + date.getHours().toString()
        const m = '0' + date.getMinutes().toString()
        const s = '0' + date.getSeconds().toString()
        return `[${h.substr(h.length-2)}:${m.substr(m.length-2)}:${s.substr(s.length-2)}] `
      },
      
      levenshteinDistance(str1, str2) {
        const m = str1.length
        const n = str2.length
        const dp = []
  
        for (let i = 0; i <= m; i++) {
          dp[i] = []
          for (let j = 0; j <= n; j++) {
            if (i === 0) {
              dp[i][j] = j
            } else if (j === 0) {
              dp[i][j] = i
            } else {
              dp[i][j] = Math.min(
                dp[i - 1][j - 1] + (str1[i - 1] === str2[j - 1] ? 0 : 1),
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1
              )
            }
          }
        }
        return dp[m][n]
      },
  
      buscarPalabrasContienen(palabra, lista) {
        const sugerencias = []
        const sugerenciasOrdenadas = []
        for (const comando of lista) {
          if (comando.includes(palabra)) {
            sugerencias.push({ comando, distancia: this.levenshteinDistance(palabra, comando) })
          }
        }
        sugerencias.sort((a, b) => a.distancia - b.distancia)
        for (let i = 0; i < Math.min(5, sugerencias.length); i++) {
          sugerenciasOrdenadas.push(sugerencias[i].comando)
        }
        return sugerenciasOrdenadas
      },
  
      updateCharCount() {
        let message = this.inputText.trim()
        if (message.startsWith('/') && message.length >= 2) {
          const similar_words = this.buscarPalabrasContienen(message.substr(1).toLowerCase(), this.command_names)
          if (similar_words.length > 0) {
            const most_similar = this.commands[similar_words[0]]
            let desc = this.getCommandDescription(most_similar)
            
            let html = `<b>/${similar_words[0]} 
              ${most_similar.args.length > 0 ? `[${most_similar.args.join(' ')}]` : ''} 
              ${most_similar.admin > 0 ? `(ADM: ${most_similar.admin})` : ''} - ${desc}</b>`
  
            const not_so_similar = similar_words.slice(1)
            html += not_so_similar.map((word) => {
              const command = this.commands[word]
              const desc = this.getCommandDescription(command)
              return `<br>/${word} - ${desc}`
            }).join('')
  
            this.autoCompleteHtml = html
            this.complete_word = similar_words[0]
          }
        } else {
          this.autoCompleteHtml = ''
          this.complete_word = ''
        }
      },
  
      getCommandDescription(command) {
        if (typeof command.desc === 'object') {
          return command.desc[this.lang] || command.desc['~~~']
        }
        return typeof command.desc === 'string' ? command.desc : '~~~'
      },
  
      handleTabComplete() {
        if (this.complete_word.length > 0) {
          this.inputText = `/${this.complete_word}`
          this.complete_word = ''
        }
      },
  
      setChatInputStatus(status) {
        if ((!this.chatActive && status) || (status === this.chatInputStatus)) return
  
        if (typeof mp !== 'undefined') {
          mp.invoke("focus", status)
          mp.invoke("setTypingInChatState", status)
          mp.trigger("player::chatOpen", JSON.stringify({status: status}))
        }
  
        this.chatInputStatus = status
        if (status) {
          if (this.settings.scrollbar) {
            this.showScrollbar = true
            if (this.hideScrollbarTimer) {
              clearTimeout(this.hideScrollbarTimer)
            }
            this.hideScrollbarTimer = setTimeout(() => {
              this.showScrollbar = false
            }, 10000)
          }
          this.$nextTick(() => {
            this.$refs.chatInput?.focus()
          })
        } else {
          this.autoCompleteHtml = ''
        }
      },
  
      sendInput() {
        let message = this.inputText.trim()
  
        if (this.settings.removeInputColors) {
          message = message.replace(/(?=!{).*(?<=})/g, '')
        }
  
        if (message.length < 1) {
          this.setChatInputStatus(false)
          return
        }
  
        if (message[0] === '/') {
          if (message.length < 2) {
            this.setChatInputStatus(false)
            return
          }
          if (typeof mp !== 'undefined') {
            mp.invoke('command', message.substr(1))
          } else {
            this.pushMessage(message)
          }
        } else {
          if (typeof mp !== 'undefined') {
            mp.invoke('chatMessage', message)
          } else {
            this.pushMessage(`6${message}`)
          }
        }
  
        this.inputHistory.unshift(message)
        if (this.inputHistory.length > 100) {
          this.inputHistory.pop()
        }
        
        this.inputText = ''
        this.inputHistoryPosition = -1
        this.setChatInputStatus(false)
      },
  
      onArrowUp() {
        if (this.inputHistoryPosition === this.inputHistory.length - 1) return
        
        if (this.inputHistoryPosition === -1) {
          this.inputCache = this.inputText
        }
  
        this.inputHistoryPosition++
        this.inputText = this.inputHistory[this.inputHistoryPosition]
      },
  
      onArrowDown() {
        if (this.inputHistoryPosition === -1) return
  
        if (this.inputHistoryPosition === 0) {
          this.inputText = this.inputCache
          this.inputHistoryPosition = -1
          return
        }
  
        this.inputHistoryPosition--
        this.inputText = this.inputHistory[this.inputHistoryPosition]
      },
  
      pushMessage(text) {
        let colorClass = ''
        let processedText = text

        // Process color classes same as before
        switch(text[0]) {
          case '0':
            processedText = text.substr(1)
            colorClass = 'color-purple'
            break
          case '1':
            processedText = text.substr(1)
            if (this.settings.colorBackground) {
              processedText = `🚩 ${processedText}`
            }
            colorClass = 'color-error'
            break
          // ... other cases remain the same ...
        }

        if (!this.settings.colorBackground) {
          colorClass += ' hide3'
        }

        // The message text is now treated as HTML
        this.messages.push({
          text: processedText,
          timestamp: this.getDateString(),
          colorClass
        })

        // Trim messages if there are too many
        if (this.messages.length > 100) {
          this.messages.shift()
        }

        // Scroll to bottom and handle timers
        this.$nextTick(() => {
          const messageList = this.$refs.messageList
          if (messageList) {
            messageList.scrollTop = messageList.scrollHeight
          }
        })
  
        if (this.settings.scrollbar) {
          this.showScrollbar = true
          if (this.hideScrollbarTimer) {
            clearTimeout(this.hideScrollbarTimer)
          }
          this.hideScrollbarTimer = setTimeout(() => {
            this.showScrollbar = false
          }, 8000)
  
          if (this.settings.autohide > 0) {
            if (this.hideChatTimer) {
              clearTimeout(this.hideChatTimer)
            }
            if (!this.isHidden) {
              this.hideChatTimer = setTimeout(() => {
                this.isHidden = true
              }, this.settings.autohide)
            }
          }
        }
      },

      clearMessages() {
        this.messages = []
      },

      activateChat(toggle) {
        if (!toggle && this.chatActive) {
          this.setChatInputStatus(false)
        }
        this.chatActive = toggle
      },

      showChat(toggle) {
        if (!toggle && this.chatInputStatus) {
          this.setChatInputStatus(false)
        }
        this.isHidden = !toggle
        this.isVisible = toggle
        this.chatActive = toggle
      },

      setFontSize(size) {
        if (this.$el) {
          this.$el.style.fontSize = `${size}px`
        }
      },

      setChatSize(size) {
        this.chatSize = size
      },

      setCommands(commandsStr, lang) {
        this.commands = JSON.parse(commandsStr)
        this.command_names = Object.keys(this.commands)
        this.lang = lang
      },

      toggleSolidChat() {
        this.settings.solidchat = !this.settings.solidchat
      }
    },
    mounted() {
        window.Chat = {
          setCommandsTest: this.setCommands('{"test": {"desc": "Test command", "args": [], "admin": 0}}', 'es'),
          enableTimestamp: (status) => {this.settings.timeStamp = status},
          enableColorBackground: (status) => {this.settings.colorBackground = status},
          fontSize: (size) => {this.setFontSize(size)},
          chatSize: (size) => {this.setChatSize(size)},
          enableSolidChat: (status) => {this.settings.solidchat = !this.settings.solidchat},
          enableScrollbar: (status) => {this.settings.scrollbar = !this.settings.scrollbar},
          enableCharacterCount: (status) => {this.settings.characterCount = status},
          enableAutohide: (time) => {this.settings.autohide = time},
          clearChat: () => {this.clearMessages()},
          showChat: (status) => {this.showChat(status)},
          activateChat: (status) => {this.activateChat(status)},
        }

        window.addEventListener('keydown', (e) => {
          if (e.key === 't' && !this.chatInputStatus && this.chatActive) {
            this.setChatInputStatus(true)
            e.preventDefault()
          }
        })
  
        this.pushMessage('Chat iniciado')

        window.chatSetCommands = (commandsStr, lang) => {
          console.log('Setting commands', commandsStr, lang)
          this.setCommands(commandsStr, lang)
        }

        if (typeof mp !== 'undefined') {
        const api = {
          'chat:push': this.pushMessage,
          'chat:clear': this.clearMessages,
          'chat:activate': this.activateChat,
          'chat:show': this.showChat,
          'chat:solidchat': this.toggleSolidChat,
          'chat:fontSize': this.setFontSize,
          'chat:chatSize': this.setChatSize,
        }
        


        for (const [eventName, handler] of Object.entries(api)) {
          mp.events.add(eventName, handler)
        }
      }
    },
    beforeUnmount() {
      if (typeof mp !== 'undefined') {
        const events = [
          'chat:push',
          'chat:clear',
          'chat:activate',
          'chat:show',
          'chat:solidchat',
          'chat:fontSize',
          'chat:chatSize',
        ]

        for (const event of events) {
          mp.events.remove(event)
        }
      }
      window.chatSetCommands = null

      if (this.hideScrollbarTimer) {
        clearTimeout(this.hideScrollbarTimer)
      }
      if (this.hideChatTimer) {
        clearTimeout(this.hideChatTimer)
      }
    }
  }


  </script>

  <style src="./main.css"></style>