const { Schema, model } = require('mongoose')

const schema = new Schema({
  email: { type: String, required: false, unique: false },
  login: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  registerDate: { type: Date, required: true },
  typeUser: { type: String, required: true },
  status: { type: Boolean, required: false },
  intevals: { type: Object, required: false },
  currency: { type: String, required: false },
  luck: { type: Number, required: true },
  amountMax: { type: Number, required: false },
  amountMin: { type: Number, required: false }
})

module.exports = model('User', schema)