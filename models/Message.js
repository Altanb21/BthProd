const { Schema, model } = require('mongoose')

const schema = new Schema({
  sender: { type: String, required: false },
  date: { type: Date, default: false, required: true },
  status: { type: Boolean, required: true },   //. Admin, User, ?Bot or more
  text: { type: String, required: true },
  day: { type: String, required: true }
})

module.exports = model('Message', schema)