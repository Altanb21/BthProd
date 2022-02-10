const { Router } = require('express')
const router = Router()

const User = require('../models/User')

const config = require('../config')
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const { check, validationResult } = require("express-validator")


// /auth/register
router.post('/register',
  [
    check("password", "Минимальная длинна пароля составляет 4 символа").isLength({ min: 4 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)

      if (!errors.isEmpty()) {
        return res.status(400).json({
          ok: false,
          errors: errors.array(),
          message: "Получены неверные данные при регистрации"
        })
      }

      const { email, password, typeUser, login, currency, luck, amountMax, amountMin, intevals } = req.body

      let candidate

      if(email) {
        candidate = await User.findOne({ email })
      } else {
        candidate = await User.findOne({ login })
      }

      if (candidate) {
        return res.status(400).json({ok: false, message: "Такой пользователь уже существует" })
      }

      const hashedPassword = await bcrypt.hash(password, 12)

      if(typeUser != '') type = 'User'
      const registerDate = new Date()

      const user = new User({ email, password: hashedPassword, typeUser, registerDate, login, currency, luck, amountMax, amountMin, intevals })

      await user.save()

      const token = jwt.sign(
        { userId: user.id },
        config.JWT_SECRET,
        { expiresIn: "30d" }
      )

      return res.status(200).json({ ok: true, message: 'Пользователь создан', token, userId: user.id })
    } catch (e) {
      const error = e
      res.status(501).json({ ok: false, message: 'Что-то пошло не так, попробуйте снова', error: `Детали: ${error}` })
    }
  })


// /auth/login
router.post('/login',
  [
    check('password', 'Введите пароль').exists()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)

      if (!errors.isEmpty()) {
        return res.status(400).json({
          ok: false,
          errors: errors.array(),
          message: 'Некорректные данные при входе в систему'
        })
      }

      const { login, password } = req.body

      const user = await User.findOne({ login })

      if (!user) {
        return res.status(400).json({ ok: false, message: 'Пользователь не найден' })
      }

      const isMatch = await bcrypt.compare(password, user.password)

      if (!isMatch) {
        return res.status(400).json({ ok: false, message: 'Неверный пароль, попробуйте снова' })
      }

      const token = jwt.sign(
        { userId: user.id },
        config.JWT_SECRET,
        { expiresIn: "1d" }
      )

      return res.status(200).json({ ok: true, message: 'Всё ок', token, userId: user.id })
    } catch (e) {
      const error = e
      res.status(501).json({ ok: false, message: 'Что-то пошло не так, попробуйте снова', error: `Детали: ${error}` })

      console.log(error)
    }
  })

module.exports = router