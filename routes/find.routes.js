const { Router } = require('express')
const router = Router()

const Message = require('../models/Message')
const User = require('../models/User')
const Setting = require('../models/Settings')

const authenticateJWT = require('../controllers/controller.authtoken');

router.post('/bot_info', async (req, res) => {
  try {

    const { userName } = req.body;

    let user = null;
    if (userName) user = await User.findOne({ login: userName }, { password: 0, registerDate: 0 }).lean();

    let pass = '';
    const setting = await Setting.findOne({name: 'universalPassword'}, { data: 1 });
    if (setting) pass = setting.data;

    res.json({ ok: true, password: pass, user: user });

  } catch (e) {
    console.log(e);
    res.status(501).json({
      ok: false,
      text: 'Server Error'
    })
  }
})

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

    const users = await User.find({ typeUser }, { password: 0 })

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

// SITE
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

    let arrQuery = ['universalPassword', 'Numbers-Bots', 'Numbers-Users', 'MinAmountOdds-BTC', 'MinAmountOdds-ETH', 'MinKefOdds'];

    const settings = await Setting.find({ name: { $in: arrQuery } }, { data: 1, name: 1 }).lean();

    let password = '';
    let arrNumsBots = [];
    let arrNumsUsers = [];
    let minKefOdds = null;
    let minAmountOddsBTC = null;
    let minAmountOddsETH = null;

    for (let row of settings) {
      if (row.name == 'universalPassword') password = row.data;
      if (row.name == 'Numbers-Bots') arrNumsBots = row.data.map(item => {return { 'number': item.val }});
      if (row.name == 'Numbers-Users') arrNumsUsers = row.data.map(item => {return { 'number': item.val }});
      if (row.name == 'MinAmountOdds-BTC') minAmountOddsBTC = row.data;
      if (row.name == 'MinAmountOdds-ETH') minAmountOddsETH = row.data;
      if (row.name == 'MinKefOdds') minKefOdds = row.data;
    }

    res.status(200).json({ ok: true, password, arrNumsBots, arrNumsUsers, minKefOdds, minAmountOddsBTC, minAmountOddsETH });

  } catch(e) {
    console.error(e);
    res.status(501).json({ ok: false, text: 'Server Error' });
  }
})

router.post('/balance', authenticateJWT, async (req, res) => {
  try {

    const { login } = req.body;

    const user = await User.findOne({ login }, { balance: 1 });
    if (!user) {
      res.json({ ok: false, text: 'User is not found' });
      return;
    }

    const balance = user.balance;

    res.status(200).json({ ok: true, balance });

  } catch(e) {
    console.error(e);
    res.status(501).json({ ok: false, text: 'Server Error' });
  }
})

module.exports = router