const { Router } = require('express')
const router = Router()

const ChatMessage = require('../models/ChatMessage')
const Message = require('../models/Message')

// /message/create
router.post('/create', async (req, res) => {
  try {
    const { text, day, sender, time } = req.body;
    const thisDate = new Date()

    const botsMessage = {
      date: thisDate,
      sender,
      text,
      status: false,
      day,
      time
    }

    const message = new Message({ ...botsMessage });
    await message.save();

    // Если день отправки сообщений сегодня, то необходимо создать это сообщение в чате
    const nowDayName = new Date().toLocaleDateString('en-EN', { weekday: 'long' });
    if (nowDayName == day) {

      let dateSend = new Date();
      let part_time = time.split(':');
      dateSend.setHours(part_time[0], part_time[1]);

      const chatMessage = new ChatMessage({
        sender,
        text,
        date: dateSend
      });

      await chatMessage.save();

    }

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