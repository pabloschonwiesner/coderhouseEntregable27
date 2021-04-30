const express = require('express')
const exphbs = require('express-handlebars')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const MongoStore = require('connect-mongo')
const mongoose = require('mongoose')
const Usuario = require('./models/usuario.model')

const ProductoServicio = require('./services/producto.service')
const UsuarioServicio = require('./services/usuario.service')

const app = express()
let productoServicio = new ProductoServicio()
const usuarioServicio = new UsuarioServicio()

app.use(session({
  secret: 'clavesecreta',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/ecommerce'}),
  cookie: {
    maxAge: 600000
  }
}))

app.use(passport.initialize());
app.use(passport.session());

app.engine('.hbs', exphbs({extname: '.hbs', defaultLayout: 'main.hbs'}))
app.set('view engine', '.hbs')

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(express.static('public'))

function validarPassword ( passwordReq, passwordBD )  {
  return bcrypt.compareSync(passwordReq, passwordBD )
}

checkIsAuthenticated = (req, res, next) => {
  if(req.isAuthenticated()) {
    next()
  } else {
    res.render('login')
  }
}



passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser((id, done) => {
  Usuario.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use('login', new LocalStrategy({usernameField: 'usuario', passwordField: 'password', session: true}, async ( username, password, cb) => { 
    try {
      let usuarioDB = await usuarioServicio.getUserByName( username )
      if(usuarioDB.length > 0) {
        if(!validarPassword(password, usuarioDB[0].password)) {
          return cb(null, false)
        }
        return cb(null, usuarioDB[0])
      } else {
        return cb(null, false)
      }
    } catch ( err ) { console.log(err); return cb(err)}
  })
)



app.get('/', checkIsAuthenticated,  (req, res) => {
  res.redirect('/producto')      
})

app.get('/login', (req, res) => {
  let usuarioExistente = JSON.parse(req.query.ue || false)
  let passwordIncorrecto = JSON.parse(req.query.pi || false)
  res.render('login', { usuarioExistente, passwordIncorrecto } )
})

app.get('/register', (req, res) => {
  res.sendFile(`${__dirname}/public/register.html`)
})

app.get('/producto', checkIsAuthenticated, async (req, res) => {
  res.render('productos', { productos: await productoServicio.getAll(), listExists: true} )
})

app.post('/producto', async  (req, res) => {
  try {
    if(req.body) {
      await productoServicio.add(req.body)
    }
    res.redirect('/producto')
  } catch ( err ) { console.log(err) }
})

app.post('/register', async (req, res) => {
  let usuario = await usuarioServicio.getUserByName(req.body.usuario.toLowerCase())
  let ue = true
  if(usuario.length == 0) {
    ue = false
    let hashPassword = function ( password ) {
      return bcrypt.hashSync( password , bcrypt.genSaltSync(10), null)
    }
  
    let nuevoUsuario = { 
      usuario: req.body.usuario.toLowerCase(), 
      password: hashPassword(req.body.password), 
      email: req.body.email.toLowerCase()
    }
  
    await usuarioServicio.add(nuevoUsuario)
  }
  return res.redirect(`/login?ue=${ue}`)  
})

app.post('/ingresar', passport.authenticate('login', { failureRedirect: '/login?pi=true'}), async (req, res) => {
  try {
    res.redirect('/producto')
  } catch ( err ) { console.log(err) }
})

app.get('/salir', (req, res) => {
  req.session.destroy( () => {
    res.redirect('/')
  })
})



app.listen(3232, () => {
  console.log('Escuchando el puerto 3232')
  mongoose.connect('mongodb://localhost:27017/ecommerce', {useNewUrlParser: true, useUnifiedTopology: true}, (err) => {
  if(err) console.log(err);
  
  console.log('Base de datos ONLINE');
});
})
app.on('error', (err) => { console.log(`Error de conexion: ${err}`)})