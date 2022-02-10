const { Router } = require('express')
const router = Router()

const User = require('../models/User')
const Message = require('../models/message')

// /message/create
router.post('/create', async (req, res) => {
  try {
    const { text, day, sender } = req.body;
    const thisDate = new Date()

    const botsMessage = {
      date: thisDate,
      sender,
      text,
      status: false,
      day
    }

    const message = new Message({ ...botsMessage })

    message.save()

    return res.status(200).json({
      ok: true,
      message: 'Сообщение создано',
      botsMessage
    })
  } catch (e) {
    const error = e
    res.status(501).json({
      ok: false,
      message: 'Что-то пошло не так, попробуйте снова',
      error: `Детали: ${error}`
    })
  }
})

module.exports = router