const { Schema, model } = require('mongoose')

const schema = new Schema({
  name: { type: String, required: true },
  data: { type: Object, required: true },
})

module.exports = model('Settings', schema)