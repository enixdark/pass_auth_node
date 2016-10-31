let isLoggedIn = require('./middlewares/isLoggedIn')
let setHeader = require('./middlewares/setHeader')

let R = require('ramda')
let Twitter = require('twitter')
let then = require('express-then')
let posts = require('../data/posts')
module.exports = (app) => {
  let passport = app.passport
  let scope = 'email'

  app.get('/', (req, res) => {
    console.log('test\n\n')
    res.render('index.ejs', {message: req.flash('error')})
  })

  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/timeline',
    failureRedirect: '/',
    failureFlash: true
  }))
  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/timeline',
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

  app.get('/timeline', isLoggedIn, setHeader(app), then(async (req, res) => {

    let tweets = await req.twitterClient.promise.get('statuses/user_timeline', { count: 100})
    debugger
    let datas = tweets.map( tweet => {
      return {
        id: tweet.id_str,
        image: tweet.user.profile_image_url,
        text: tweet.text,
        name: tweet.user.name,
        username: `@${tweet.user.screen_name}`,
        liked: tweet.favorited
      }
    })
    res.render('timeline.ejs',{
      posts: datas.slice((req.query.page - 1)*20,20),
      pageCount: Math.ceil(datas.length/20),
      itemCount: 20,
      pages: app.paginate.getArrayPages(req)(3, Math.ceil(datas.length/20), req.query.page)
    })
  }))

  app.get('/compose', isLoggedIn, then(async (req, res) => {
    res.render('compose.ejs')
  }))

  app.post('/compose', isLoggedIn, setHeader(app), then(async (req, res) => {
    let status = req.body.reply
    if(status.length > 140){
      return req.flash('error', 'Status is over 140 characters')
    }
    if(!status){
      req.flash('error', 'Status is cannot empty')
    }
    await req.twitterClient.promise.post('/statuses/update', {status})
    res.redirect('/timeline')
  }))

  app.post('/like/:id', isLoggedIn, setHeader(app), then(async (req, res) => {
    try{
      let id = req.params.id
      await req.twitterClient.promise.post('favorites/create', {id: id})
      res.end()
    }catch(e){
      console.log(e, e.message)
    }
  }))

  app.post('/unlike/:id', isLoggedIn, setHeader(app), then(async (req, res) => {
    let id = req.params.id
    await req.twitterClient.promise.post('favorites/destroy', {id: id})
    res.end()
  }))

  app.get('/reply/:id', isLoggedIn, setHeader(app), then(async (req,res) => {
    let tweet = await req.twitterClient.promise.get('statuses/show', {id: req.params.id})
    res.render('reply.ejs', 
      {post: {
        id: tweet.id_str,
        image: tweet.user.profile_image_url,
        text: tweet.text,
        name: tweet.user.name,
        username: `@${tweet.user.screen_name}`,
        liked: tweet.favorited
        }
      })
  }))

  app.post('/reply/:id', isLoggedIn, setHeader(app), then(async (req, res) => {
    let status = req.body.reply
    if(status.length > 140){
      return req.flash('error', 'Status is over 140 characters')
    }
    if(!status){
      req.flash('error', 'Status is cannot empty')
    }
    await req.twitterClient.promise.post('statuses/update', {status: status, 
                                                             in_reply_to_status_id: req.params.id})
    res.redirect('/timeline')
  }))

  app.get('/share/:id', isLoggedIn, setHeader(app), then(async (req, res) => {
    let tweet = await req.twitterClient.promise.get('statuses/show', {id: req.params.id})
    // await req.twitterClient.promise.post('statuses/retweet', {id: req.params.id})
    res.render('share.ejs', 
      {post: {
        id: tweet.id_str,
        image: tweet.user.profile_image_url,
        text: tweet.text,
        name: tweet.user.name,
        username: `@${tweet.user.screen_name}`,
        liked: tweet.favorited
        }
      })
  }))

  app.post('/share/:id', isLoggedIn, setHeader(app), then(async (req, res) => {
    let status = req.body.share
    if(status.length > 140){
      return req.flash('error', 'Status is over 140 characters')
    }
    if(!status){
      req.flash('error', 'Status is cannot empty')
    }
    await req.twitterClient.promise.post('statuses/retweet', { status: status, id: req.params.id})
    res.redirect('/timeline')
  }))

  R.forEach( item => {
    scope = item == 'linkedin' ? 'r_emailaddress' : 'email'

    app.get(`/auth/${item}`, passport.authenticate(item, {scope}))
    app.get(`/auth/${item}/callback`, passport.authenticate(item, {
      successRedirect: '/timeline',
      failureRedirect: '/timeline',
      failureFlash: true
    }))

    // Authorization route & Callback URL
    app.get(`/connect/${item}`, passport.authorize(item, {scope}))
    app.get(`/connect/${item}/callback`, passport.authorize(item, {
      successRedirect: '/profile',
      failureRedirect: '/profile',
      failureFlash: true
    }))

    app.get(`/unlink/${item}`, then(async (req, res) => {
      let user  = req.user
      user[item].token = null
      await user.save()
      res.redirect('/profile')
    }))
  }, ['facebook','linkedin', 'twitter', 'google'])

  return passport 

}
