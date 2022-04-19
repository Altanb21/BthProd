const { Schema, model } = require('mongoose')

const schema = new Schema({
  email: { type: String },
  login: { type: String, unique: true },
  password: { type: String },
  registerDate: { type: Date },
  typeUser: { type: String },
  status: { type: Boolean },
  intevals: { type: Object },
  currency: { type: String },
  luck: { type: Number },
  amountMax: { type: Number },
  amountMin: { type: Number },
  balance: {
    eth: { type: Number, default: 0 },
    btc: { type: Number, default: 0 }
  }
})

module.exports = model('User', schema)