const { Router } = require('express')
const router = Router()

const Setting = require('../models/settings');

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
    const { value } = req.body;

    const setting = await Setting.findOne({ name: 'Numbers' }, { data: 1 });
    let arrNumbers = [];
    if (setting) arrNumbers = setting.data;
    
    arrNumbers.push(value);

    const newData = {
      name: 'Numbers', 
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

module.exports = router