const { Schema, model } = require('mongoose')

const schema = new Schema({
  sender: { type: String, required: true },
  date: { type: Date, unique: false, required: true },
  text: { type: String, required: true },
})

module.exports = model('msg', schema)