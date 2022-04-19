const { Router } = require('express')
const router = Router()

const Message = require('../models/Message')
const User = require('../models/User')
const Setting = require('../models/Settings')

const authenticateJWT = require('../controllers/controller.authtoken');

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
router.post('/password', async (req, res) => {
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
router.post('/numbers', async (req, res) => {
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
});

router.post('/email', authenticateJWT, async (req, res) => {
  try {

    const _id = req.user.userId;

    const user = await User.findOne({ _id }, { email: 1 }).lean();

    res.status(200).json({ ok: true, email: user.email });

  } catch(e) {
    console.error(e);
    res.status(501).json({ ok: false, text: 'Server Error' });
  }
});
router.post('/settings', authenticateJWT, async (req, res) => {
  try {

    const settings = await Setting.find({ name: { $in: ['universalPassword', 'Numbers-Bots', 'Numbers-Users'] } }, { data: 1, name: 1 }).lean();

    let password = '';
    let arrNumsBots = [];
    let arrNumsUsers = [];

    for (let row of settings) {
      if (row.name == 'universalPassword') password = row.data;
      if (row.name == 'Numbers-Bots') arrNumsBots = row.data.map(item => {return { 'number': item.val }});
      if (row.name == 'Numbers-Users') arrNumsUsers = row.data.map(item => {return { 'number': item.val }});
    }

    res.status(200).json({ ok: true, password, arrNumsBots, arrNumsUsers });

  } catch(e) {
    console.error(e);
    res.status(501).json({ ok: false, text: 'Server Error' });
  }
})

module.exports = router