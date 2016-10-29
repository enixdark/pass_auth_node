let isLoggedIn = require('./middlewares/isLoggedIn')
let R = require('ramda')

module.exports = (app) => {
  let passport = app.passport
  let scope = 'email'

  app.get('/', (req, res) => {
    console.log('test\n\n')
    res.render('index.ejs', {message: req.flash('error')})
  })

  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/profile',
    failureRedirect: '/',
    failureFlash: true
  }))
  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile',
    failureRedirect: '/',
    failureFlash: true
  }))

  app.get('/profile', isLoggedIn, (req, res) => {
    res.render('profile.ejs', {
      user: req.user,
      message: req.flash('error')
    })
  })

  app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
  })

  app.get('/login', (req, res) => {
      res.render('login.ejs', {message: req.flash('error')})
  })

  app.get('/signup', (req, res) => {
      res.render('signup.ejs', {message: req.flash('error') })
  })

  app.get('/connect/local', (req, res) => {
      res.render('connect-local.ejs', {message: req.flash('error') })
  })

  app.post('/connect/local', passport.authenticate('local-login', {
    successRedirect: '/profile',
    failureRedirect: '/',
    failureFlash: true
  }))

  app.get(`/unlink/local`, async (req, res) => {
    let user = req.user
    user.local.email = null
    user.local.password = null
    await user.save()
    res.redirect('/profile')
  })


  // app.get('/auth/facebook', passport.authenticate('facebook', {scope}))
  // app.get('/auth/facebook/callback', passport.authenticate('facebook', {
  //   successRedirect: '/profile',
  //   failureRedirect: '/profile',
  //   failureFlash: true
  // }))

  // // Authorization route & Callback URL
  // app.get('/connect/facebook', passport.authorize('facebook', {scope}))
  // app.get('/connect/facebook/callback', passport.authorize('facebook', {
  //   successRedirect: '/profile',
  //   failureRedirect: '/profile',
  //   failureFlash: true
  // }))


  // app.get('/auth/twitter', passport.authenticate('twitter', {scope}))
  // app.get('/auth/twitter/callback', passport.authenticate('twitter', {
  //   successRedirect: '/profile',
  //   failureRedirect: '/profile',
  //   failureFlash: true
  // }))

  // // Authorization route & Callback URL
  // app.get('/connect/twitter', passport.authorize('twitter', {scope}))
  // app.get('/connect/twitter/callback', passport.authorize('twitter', {
  //   successRedirect: '/profile',
  //   failureRedirect: '/profile',
  //   failureFlash: true
  // }))

  R.forEach( item => {
    scope = item == 'linkedin' ? 'r_emailaddress' : 'email'

    app.get(`/auth/${item}`, passport.authenticate(item, {scope}))
    app.get(`/auth/${item}/callback`, passport.authenticate(item, {
      successRedirect: '/profile',
      failureRedirect: '/profile',
      failureFlash: true
    }))

    // Authorization route & Callback URL
    app.get(`/connect/${item}`, passport.authorize(item, {scope}))
    app.get(`/connect/${item}/callback`, passport.authorize(item, {
      successRedirect: '/profile',
      failureRedirect: '/profile',
      failureFlash: true
    }))

    app.get(`/unlink/${item}`, async (req, res) => {
      let user  = req.user
      user[item].token = null
      await user.save()
      res.redirect('/profile')
    })
  }, ['facebook','linkedin', 'twitter', 'google'])
}
