var express = require('express')
  , routes  = require('./routes')
  , admin   = require('./routes/admin')
  , http    = require('http')
  , path    = require('path')
  , pass    = require('passport')
  , LocalS  = require('passport-local').Strategy
  , mcache  = require('connect-memcached')(express)
  , app     = express()
  , assetMgr= require('connect-assetmanager');
  global.root = process.cwd() + '/'


//ASSET MANAGEMENT
var assetManagerGroups = {
  'js': { 'route': /\/javascripts\/app\.min\.js/
        , 'path': './static/js/'
        , 'dataType': 'javascript'
        , 'files': [ 'app.js', 'controllers.js'] }
}

var assetMiddleWare = assetMgr(assetManagerGroups);

//GENERAL CONFIGURATION
app.configure(function(){
  app.set('port', process.env.PORT || 8080)
  app.set('views', __dirname + '/views')
  app.set('view engine', 'jade')
  app.use(express.compress())
  app.use(express.favicon(__dirname + '/public/favicon.ico'))
  app.use(express.cookieParser()); 
  app.use(express.session(  { secret: "U^Z;$,^j6DZj<GGd"
                            , store: new mcache
                            , cookies:  { secure: false
                                        , maxAge: 86400000 } }))
  app.use(express.bodyParser({ keepExtensions: true}))
  app.use(express.methodOverride())
  app.use(express.csrf())
  app.use(function(req, res, next){
    var token = req.session._csrf
    , cookie  = req.cookies['csrf.token']
    , port    = (app.get('port') == 80 || app.get('port') ==443) ? '' : ':'+app.get('port')
    if (token && cookie !== token)
      res.cookie('csrf.token', token)
    res.locals.requested_url = req.protocol + '://' + req.host + req.path
    next()
  })
  app.use(pass.initialize())
  app.use(pass.session())
  app.use(app.router)
});

app.configure('development', function(){
  app.use(express.logger('dev'))
  app.use(express.errorHandler())
  app.use(assetMiddleWare);
  app.use(require('less-middleware')( { src: __dirname + '/public'
                                      , compress: true
                                      , optimization: 2 }))
  app.use(express.static(path.join(__dirname, 'public')))
   console.log('development mode')
});

app.configure('production', function(){
  var live = 86400000
  app.use(express.static(path.join(__dirname, 'public'), {maxAge: live}))
  console.log('production mode')
});

//MIDDLEWARE
function ensureAuthenticated(req, res, next){
  if (req.isAuthenticated()) { return next() }
  res.redirect('/#/login')
}

//load db async
require('./models')(function(resp){
  var Settings    = require('./controllers/settings')(resp)
      , Stats       = require('./controllers/statistics')(resp)
      , PowerUsers  = require('./controllers/powerUsers')(resp)
      , Api         = require('./controllers/api')(resp)

  pass.use(new LocalS(
    function(username, password, done){
      resp.powerUsers.find({username:username}, function(err,doc){
        if(err)
          return done(err)
        if (doc.length < 1)
          return done(null,false)
        doc[0].comparePassword(password, function(err,resp){
          if (err)
            return done(err)
          if (resp)
            return done(null, doc[0])
        })
      })
    }
  ))

  pass.serializeUser(function(user,done){
    return done(null,user._id)
  })

  pass.deserializeUser(function(id,done){
    if (!id)
      return done(null,false)
    resp.powerUsers.find({_id: id}, function(err, resp){
      return done(null,resp)
    })
  })

  //VIEWS
  app.get ('/', routes.index)
  app.get ('/views/:view.html', routes.views)
  app.get ('/views/admin/:view.html', ensureAuthenticated, admin.views)
  app.get ('/admin*', ensureAuthenticated, admin.index)
  app.get ('/logout', function(req,res){
    req.logout()
    res.redirect('/')
  })

  //API
  app.post('/api/login', pass.authenticate('local'), function(req,res) {
    if (req.user) res.json({error:0})
    else res.send(401)
  })


  //START APPLICATION PROCESS WORKERS FOR EACH LOGICAL CPU
  var server = http.createServer(app)
    , cluster = require('cluster')
    , numCPUs = require('os').cpus().length
    , i       = 0
  if (cluster.isMaster) {
    for (; i < numCPUs; i++)
      cluster.fork()
    cluster.on('death', function(worker) {
      cluster.fork()
    })
  } else {
    server.listen(app.get('port'), function(){
      console.log("Express server listening on port " + app.get('port'))
    })
  }
})