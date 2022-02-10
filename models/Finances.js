const { Schema, model } = require('mongoose')

const schema = new Schema({
  date: { type: Date, required: true },
  count: { type: Number, required: true },
  currency: { type: String, required: true },
  status: { type: String, required: true },
  typeFinances: { type: String, required: true }  // Input or Conclusion   
})

module.exports = model('Finances', schema)