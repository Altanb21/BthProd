const { Schema, model } = require('mongoose')

const schema = new Schema({
  number: Number,
  date: Date,
  bets: Object
}, {
  timestamps: true
})

module.exports = model('Game', schema)