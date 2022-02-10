const { Schema, model } = require('mongoose')

const schema = new Schema({
  sender: { type: String, required: true },
  time: { type: String, unique: false, required: true },
  text: { type: String, required: true },
})

module.exports = model('msg', schema)