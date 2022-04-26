const { Router } = require('express')
const router = Router()

const User = require('../models/User')

const config = require('../config')
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const { check, validationResult } = require("express-validator");

const authenticateJWT = require('../controllers/controller.authtoken');

// /auth/register
router.post('/register',
  [
    check("password", "Минимальная длинна пароля составляет 6 символов").isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)

      if (!errors.isEmpty()) {
        return res.status(400).json({
          ok: false,
          errors: errors.array(),
          message: "Minimum password length 6 characters"
        })
      }

      let { email, password, typeUser, login, currency, luck, amountMax, amountMin, intevals } = req.body

      let candidate = await User.findOne({ login }).lean();

      if (candidate && candidate.typeUser != 'Bot') {
        return res.status(400).json({ok: false, message: "A user with the same username already exists" })
      }

      if (email) {
        let candidate = await User.findOne({ email });
        if (candidate) {
          return res.status(400).json({ok: false, message: "A user with the same email already exists" })
        }
      } else {
        email = login;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const balance = {
        eth: 0,
        btc: 0
      }

      if (typeUser) {
        (currency == 'BTC') ? balance.btc = amountMax * 100 : balance.eth = amountMax * 100;
      } else {
        typeUser = 'User';
      }

      if (candidate) {

        candidate.email = email;
        candidate.password = hashedPassword;
        candidate.login = login;
        candidate.currency = currency;
        candidate.luck = luck;
        candidate.amountMin = amountMin;
        candidate.amountMax = amountMax;
        candidate.intevals = intevals;
        candidate.balance = balance;

        await User.findOneAndUpdate({ _id: candidate._id }, candidate);
        
        return res.status(200).json({ ok: true, message: 'Данные пользователя обновлены' });

      } else {
        const registerDate = new Date()
        const user = new User({ 
          email, 
          password: hashedPassword, 
          typeUser, 
          registerDate, 
          login, 
          currency, 
          luck, 
          amountMax, 
          amountMin, 
          intevals,
          balance
        })

        await user.save()

        const token = jwt.sign(
          { userId: user.id, userName: user.login, userType: user.typeUser },
          config.JWT_SECRET,
          { expiresIn: "30d" }
        )

        return res.status(200).json({ ok: true, message: 'Пользователь создан', token, userId: user.id })
      }

    } catch (e) {
      console.log(e);
      const error = e
      res.status(501).json({ ok: false, message: 'Что-то пошло не так, попробуйте снова', error: `Детали: ${error}` })
    }
})

router.post('/token', authenticateJWT, async (req, res) => {

  const userId = req.user.userId;

  let user = await User.findOne({ _id: userId }, { balance: 1 });
  if (!user) {
    res.json({ ok: false, text: 'User not found' });
    return;
  }

  res.json({ ok: true, balance: user.balance });

});

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

      const { login, password } = req.body;

      const user = await User.findOne({ login })

      if (!user) {
        return res.status(400).json({ ok: false, message: 'Пользователь не найден' })
      }

      const isMatch = await bcrypt.compare(password, user.password)

      if (!isMatch) {
        return res.status(400).json({ ok: false, message: 'Неверный пароль, попробуйте снова' })
      }

      const token = jwt.sign(
        { userId: user.id, userName: user.login, userType: user.typeUser },
        config.JWT_SECRET,
        { expiresIn: "30d" }
      )

      req.user = user.id;

      return res.status(200).json({ ok: true, message: 'Всё ок', token, userId: user.id });

    } catch (e) {

      res.status(501).json({ ok: false, message: 'Что-то пошло не так, попробуйте снова', error: `Детали: ${e}` });

    }
})

router.post('/change-email', authenticateJWT, async (req, res) => {
  try {

    const _id = req.user.userId;
    const { password, email } = req.body;

    const user = await User.findOne({ _id });
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      user.email = email;
      await user.save();

      res.status(200).json({ ok: true });
    } else {
      res.json({ ok: false, text: 'Password entered incorrectly' });
    }

  } catch(e) {
    console.error(e);
    res.status(501).json({ ok: false, text: 'Server Error' });
  }
});

router.post('/change-password', authenticateJWT, async (req, res) => {
  try {

    const _id = req.user.userId;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (newPassword != confirmPassword) {
      res.json({ ok: false, text: 'New password and confirmation password do not match' });
      return;
    }
    if (newPassword.length < 6) {
      res.json({ ok: false, text: 'password must contain at least 6 characters' });
      return;
    }

    const user = await User.findOne({ _id });
    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (isMatch) {

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      user.password = hashedPassword;
      await user.save();

      res.status(200).json({ ok: true });
    } else {
      res.json({ ok: false, text: 'Old password entered incorrectly' });
    }

  } catch(e) {
    console.error(e);
    res.status(501).json({ ok: false, text: 'Server Error' });
  }
})

router.post('/change-password-admin', authenticateJWT, async (req, res) => {
  try {

    const _id = req.user.userId;
    const { secretKey, newPassword } = req.body;

    const secretKeys = ['7755', '2442', '0110', '1331'];

    if (!secretKeys.includes(secretKey)) {
      res.json({ ok: false, text: 'Secret key not found' });
      return;
    }

    const user = await User.findOne({ _id });
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ ok: true });

  } catch(e) {
    console.error(e);
    res.status(501).json({ ok: false, text: 'Server Error' });
  }
})

module.exports = router