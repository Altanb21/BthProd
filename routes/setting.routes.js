const { Router } = require('express')
const router = Router()

const Setting = require('../models/Settings');
const User = require('../models/User');

// /setting/create
router.post('/create', async (req, res) => {
  try {
    const { name, data } = req.body

    const setting = new Setting({ name, data })
    await setting.save()

    return res.status(200).json({
      message: 'Успешно! Настройка записана'
    })
  } catch (e) {
    const error = e
    res.status(501).json({
      message: 'Что-то пошло не так, попробуйте снова',
      error: `Детали: ${error}`
    })
  }
})

// /setting/supplement
router.post('/supplement', async (req, res) => {
  try {
    const { name, data } = req.body

    const candidate = await Setting.findOne({ name })

    const newData = { ...candidate.data, data }

    const setting = new Setting({ name, newData })
    await setting.save()

    return res.status(200).json({
      message: 'Успешно! Настройка записана'
    })
  } catch (e) {
    const error = e
    res.status(501).json({
      message: 'Что-то пошло не так, попробуйте снова',
      error: `Детали: ${error}`
    })
  }
})

// /setting/update
router.post('/update', async (req, res) => {
  try {
    const { name, newData } = req.body

    console.log(name, newData)

    const candidate = await Setting.findOne({ name })

    if (!candidate) {
      let dataArray = []
      dataArray.push(newData)
      const setting = new Setting({ name, data: dataArray })
      setting.save()
    }

    let moreData = []
    moreData.push(...candidate.data)
    moreData.push(newData)
    
    const setting = new Setting({ name, data: moreData })
    await setting.updateOne({ data: candidate.data }, { $set: { moreData } })

    return res.status(200).json({
      message: 'Успешно! Настройка записана'
    })
  } catch (e) {
    const error = e
    res.status(501).json({
      message: 'Что-то пошло не так, попробуйте снова',
      error: `Детали: ${error}`
    })
  }
})

// /setting/password
router.post('/password', async (req, res) => {
  try {
    const { data } = req.body;

    console.log(data);

    await Setting.findOneAndUpdate({ name: 'universalPassword' }, { name: 'universalPassword', data }, { upsert: true } )

    return res.status(200).json({
      ok: true,
      message: 'Успешно! Настройка записана'
    })
  } catch (e) {
    res.status(501).json({
      ok: false,
      message: 'Что-то пошло не так, попробуйте снова',
      error: `Детали: ${e}`
    })
  }
})

// /setting/numbers
router.post('/numbers', async (req, res) => {
  try {
    const { value, type } = req.body;

    const name = `Numbers-${type}`;

    const setting = await Setting.findOne({ name }, { data: 1 });
    let arrNumbers = [];
    if (setting) arrNumbers = setting.data;
    
    arrNumbers.push({ val: value, status: false});

    const newData = {
      name, 
      data: arrNumbers
    }

    await Setting.findOneAndUpdate({ name: newData.name }, newData, { upsert: true });

    return res.status(200).json({
      ok: true,
      message: 'Успешно! Настройка записана'
    })
  } catch (e) {
    const error = e
    res.status(501).json({
      message: 'Что-то пошло не так, попробуйте снова',
      error: `Детали: ${error}`
    })
  }
});
router.post('/remove-numbers', async (req, res) => {
  try {

    const { name, index } = req.body;

    const set = await Setting.findOne({ name }, { data: 1 }).lean();
    if (set) {
      let arr = set.data;
      arr.splice(index-1, 1);

      await Setting.findOneAndUpdate({ name }, { data: arr });
    }

    res.json({ ok: true });

  } catch(e) {
    console.error(e);
    res.status(501).json({ ok: false, text: 'Server Error' });
  }
});

// /setting/min_amount_odds
router.post('/min_amount_odds', async (req, res) => {
  try {

    const { val } = req.body;

    await Setting.findOneAndUpdate({ name: 'MinAmountOdds' }, { data: val }, { upsert: true });

    res.json({ ok: true });

  } catch(e) {
    console.error(e);
    res.status(501).json({ ok: false, text: 'Server Error' });
  }
});

// /setting/min_kef_odds
router.post('/min_kef_odds', async (req, res) => {
  try {

    const { val } = req.body;

    await Setting.findOneAndUpdate({ name: 'MinKefOdds' }, { data: val }, { upsert: true });

    res.json({ ok: true });

  } catch(e) {
    console.error(e);
    res.status(501).json({ ok: false, text: 'Server Error' });
  }
});

router.post('/set-currency-value', async (req, res) => {
  try {

    const { login, btc, eth } = req.body;

    const user = await User.findOne({ login });
    if (!user) {
      res.json({ ok: false, text: 'User not found' });
      return;
    }

    user.balance.eth = eth;
    user.balance.btc = btc;

    await user.save();

    res.json({ ok: true });

  } catch(e) {
    console.error(e);
    res.status(501).json({ ok: false, text: 'Server Error' });
  }
})

module.exports = router