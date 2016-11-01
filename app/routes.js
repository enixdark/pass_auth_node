let isLoggedIn = require('./middlewares/isLoggedIn')
let setHeader = require('./middlewares/setHeader')

let R = require('ramda')
let Twitter = require('twitter')
let then = require('express-then')
let posts = require('../data/posts')
module.exports = (app) => {
  let passport = app.passport
  let scope = ['email','user_posts','publish_actions']

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
    let [fb_datas, tweet_datas] = [[],[]]
    if(req.facebookClient){
      let profile = await new Promise((resolve, reject) => req.facebookClient.api(
        `/${req.user.facebook.id}/?fields=picture,name`, 'get', resolve))

      let response = await new Promise((resolve, reject) => req.facebookClient.api(
        `/${req.user.facebook.id}/feed?fields=likes.limit(0).summary(true),message,updated_time`, 'get', resolve))
      fb_datas = response.data.map( feed => {
        return {
          id: feed.id,
          image: profile.picture.data.url,
          text: feed.message,
          name: profile.name,
          username: `@${profile.name}`,
          liked: feed.likes.summary.has_liked,
          timestamp: feed.updated_time,
          share: false,
          network: {
            icon: 'facebook',
            name: 'Facebook',
            class: 'btn-primary'
          }
        }
      })
    }
    if(req.twitterClient){
      let tweets = await req.twitterClient.promise.get('statuses/user_timeline', { count: 100})
      debugger

      tweet_datas = tweets.map( tweet => {
        return {
          id: tweet.id_str,
          image: tweet.user.profile_image_url,
          text: tweet.text,
          name: tweet.user.name,
          username: `@${tweet.user.screen_name}`,
          liked: tweet.favorited,
          timestamp: tweet.user.created_at,
          share: tweet.retweeted_status ? true : false,
          network: {
            icon: 'twitter',
            name: 'Twitter',
            class: 'btn-info'
          }
        }
      })
    }
    let datas = Array.concat(fb_datas,tweet_datas)
                 .sort( (a,b) => new Date(a.timestamp) - new Date(b.timestamp) )
                 .reverse()
    res.render('timeline.ejs',{
      posts: datas.slice((req.query.page - 1)*20,req.query.page * 20),
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
    if(req.body.tw){
      await req.twitterClient.promise.post('/statuses/update', {status})
    }
    if(req.body.fb){
      let response = await new Promise((resolve, reject) => req.facebookClient.api(
        `/${req.user.facebook.id}/feed`, 'post', { message: status },  resolve))
      debugger

    }
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
        liked: tweet.favorited,
        network: {
            icon: 'twitter',
            name: 'Twitter',
            class: 'btn-info'
          }
        }
      })
  }))

  app.post('/reply/:id', isLoggedIn, setHeader(app), then(async (req, res) => {
    let tweet = await req.twitterClient.promise.get('statuses/show', {id: req.params.id})
    let status = req.body.reply
    if(status.length > 140){
      return req.flash('error', 'Status is over 140 characters')
    }
    if(!status){
      req.flash('error', 'Status is cannot empty')
    }
    await req.twitterClient.promise.post('statuses/update', {status: `${tweet.user.name} ${status}`,
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
        liked: tweet.favorited,
        network: {
            icon: 'twitter',
            name: 'Twitter',
            class: 'btn-info'
          }
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

  app.post('/delete/:id', isLoggedIn, setHeader(app), then(async (req, res) => {
    if(req.query.type == "facebook"){

    }
    else if(req.query.type == "twitter"){
      await req.twitterClient.promise.post('statuses/destroy', {id: req.params.id})
    }
    res.end()
  }))

  app.post('/unshare/:id', isLoggedIn, setHeader(app), then(async (req, res) => {
    if(req.query.type == "facebook"){

    }
    else if(req.query.type == "twitter"){
      await req.twitterClient.promise.post('statuses/unretweet', {id: req.params.id})
    }
    res.end()
  }))

  app.get('/post/:id', isLoggedIn, setHeader(app), then(async (req, res) => {
    let tweet = await req.twitterClient.promise.get('statuses/show', {id: req.params.id})
    res.render('show.ejs', 
      {post: {
        id: tweet.id_str,
        image: tweet.user.profile_image_url,
        text: tweet.text,
        name: tweet.user.name,
        username: `@${tweet.user.screen_name}`,
        liked: tweet.favorited,
        network: {
            icon: 'twitter',
            name: 'Twitter',
            class: 'btn-info'
          }
        }
      })
  }))

  R.forEach( item => {
    scope = item == 'linkedin' ? 'r_emailaddress' : 'email'
    app.get(`/auth/${item}`, passport.authenticate(item, {scope: scope}))
    app.get(`/auth/${item}/callback`, passport.authenticate(item, {
      successRedirect: '/timeline',
      failureRedirect: '/timeline',
      failureFlash: true
    }))

    // Authorization route & Callback URL
    app.get(`/connect/${item}`, passport.authorize(item, {scope: scope}))
    app.get(`/connect/${item}/callback`, passport.authorize(item, {
      successRedirect: '/profile',
      failureRedirect: '/profile',
      failureFlash: true
    }))

    app.get(`/unlink/${item}`, then(async (req, res) => {
      let user  = req.user
      user[item].token = null
      req[`${item}Client`] = null
      await user.save()
      res.redirect('/profile')
    }))
  }, ['facebook','linkedin', 'twitter', 'google'])

  return passport 

}
