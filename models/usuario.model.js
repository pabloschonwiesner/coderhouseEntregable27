const mongoose = require('mongoose')
const AutoIncrement = require('mongoose-sequence')(mongoose);

let Schema = mongoose.Schema;

let usuarioSchema = new Schema({
  usuario: String,
  password: String,
  email: String
})


usuarioSchema.plugin(AutoIncrement, {inc_field: 'id_usuario'});
module.exports = mongoose.model('Usuario', usuarioSchema)