const { Router } = require('express')
const router = Router()

const Message = require('../models/Message')
const User = require('../models/User')
const Setting = require('../models/settings')

// /find/message
router.post('/messages', async (req, res) => {
  try {

    let { currentDay } = req.body;

    const messages = await Message.find({ day: currentDay })

    const arrMessages = messages.map(row => {
      let status = row.status ? 'Send' : 'No Send';
      return [ row.sender, row.time, row.text, status ]
    })

    return res.status(200).json({
      ok: true,
      message: 'Успешно! Сообщения найдены',
      messages: arrMessages
    })
  } catch (e) {
    const error = e
    res.status(501).json({
      message: 'Что-то пошло не так, попробуйте снова',
      error: `Детали: ${error}`
    })
  }
})

// /find/password
router.get('/password', async (req, res) => {
  try {
    const setting = await Setting.findOne({name: 'universalPassword'}, { data: 1 })

    if(!setting) return res.status(200).json({
      ok: false,
      message: 'пароль не задан'
    })

    return res.status(200).json({
      ok: true,
      message: 'Настройка найдена',
      data: setting.data
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

// /find/numbers
router.get('/numbers', async (req, res) => {
  try {
    const setting = await Setting.findOne({ name: 'Numbers' }, { data: 1 });

    if (!setting) return res.status(501).json({ ok: false, message: 'Список чисел не найден' });

    return res.status(200).json({
      ok: true,
      message: 'Сообщения получены',
      numbers: setting.data
    })
  } catch (e) {
    const error = e
    res.status(501).json({
      ok: false,
      message: 'Ошибка сервера',
      error: `Детали: ${error}`
    })
  }
})

// /find/users
router.post('/users', async (req, res) => {
  try {

    let { typeUser, returnArray } = req.body;
    if (!typeUser) typeUser = 'Bot';

    console.log(req.body);

    const users = await User.find({ typeUser })

    if(users.length == 0) return res.status(200).json({
      ok: false,
      message: 'Пользователи не найдены'
    })

    let arrUsers = users;
    if (returnArray) arrUsers = users.map(row => { return row.login });

    return res.status(200).json({
      ok: true,
      message: 'Успешно! Пользователи успешно найдены',
      users: arrUsers
    })
  } catch (e) {
    res.status(501).json({
      ok: false,
      message: 'Что-то пошло не так, попробуйте снова',
      error: `Детали: ${e}`
    })
  }
})

// /find/user
router.post('/user', async (req, res) => {
  try {
    const { userId } = req.body

    const user = await User.findOne({ _id: userId })

    if(!user) return res.status(200).json({
      ok: false,
      message: 'Пользователь не найден'
    })

    return res.status(200).json({
      ok: true,
      message: 'Успешно! Пользователь успешно найден',
      user
    })
  } catch (e) {
    res.status(501).json({
      ok: false,
      message: 'Что-то пошло не так, попробуйте снова',
      error: `Детали: ${e}`
    })
  }
})

module.exports = router