const { Schema, model } = require('mongoose')

const schema = new Schema({
  date: { type: Date, unique: true, required: true },
  bet: { type: Number, unique: false, required: true }
})

module.exports = model('Game', schema)