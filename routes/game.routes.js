const { Router } = require('express')
const router = Router()

const User = require('../models/User')

// /game/generation
router.post('/generation', async (req, res) => {
  try {
    // const {  } = req.body
    const thisDate = new Date(dd, mm, yy)
    const thisBet = getRandomFloat(0.1, 1500)
    const playingUser = []

    function getRandomFloat(min, max) {
      return Math.random() * (max - min) + min;
    }

    return res.status(200).json({
      message: 'Успешно! Игра создана'
    })
  } catch (e) {
    const error = e
    res.status(501).json({
      message: 'Что-то пошло не так, попробуйте снова',
      error: `Детали: ${error}`
    })
  }
})

// /game/playerBots
router.get('/playerBots', async (req, res) => {
  try {
    const date = new Date()
    const Hour = date.getHours()
    const Minutes = date.getMinutes()
    const Seconds = date.getSeconds()

    const thisTIme = `${Hour}:${Minutes}:${Seconds}`

    const bots = await User.find({typeUser: 'Bot'})
    console.log('bots', bots)

    return res.status(200).json({
      message: 'Успешно! Найдены играющие пользователи',
      bots
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