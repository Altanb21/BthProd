const { Server } = require("socket.io")
const io = new Server(server)

const Message = require('../models/message')

const sendMessage = require('./sendMessage')

const chat = async () => {

  io.on('connection', (socket) => {
    
    socket.on('sendMessage'), (msg) => {
      const messageData = {
        sender: senderToken,
        date: new Date(),
        status: 'User',
        text: msg.text,
      }

      const message = new Message({...messageData})

      message.save()
    }
  })
}