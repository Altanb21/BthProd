const { Router } = require('express')
const router = Router()
const { Server } = require("socket.io")
const io = new Server()

const Message = require('../models/message')

// /chat/
router.post('/', async (req, res) => {
  try {
    // const messages = await Message.find()

    io.on('connection', async (socket) => {

      socket.on('sendMessage'), async (msg) => {
        const messageData = {
          sender: senderToken,
          date: new Date(),
          status: 'User',
          text: msg.text,
        }

        const message = new Message({ ...messageData })

        message.save()

        msg.emit('message', message)
      }      
      socket.emit('messages', messages)
    })



  } catch (e) {
    const error = e
    res.status(501).json({
      message: 'Что-то пошло не так, попробуйте снова',
      error: `Детали: ${error}`
    })
  }
})

module.exports = router