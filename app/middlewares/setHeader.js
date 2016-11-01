let Twitter = require('twitter')
let {FB, FacebookApiException} = require('fb')
let then = require('express-then')
module.exports = (app) => {
  return then(async (req, res, next) => {
    let user = await req.user
    if(user.twitter.token){
      req.twitterClient = new Twitter({
        consumer_key: app.config.twitter.consumerKey,
        consumer_secret: app.config.twitter.consumerSecret,
        access_token_key: user.twitter.token,
        access_token_secret: user.twitter.secret
      })
    }
    if(user.facebook.token){
      FB.setAccessToken(user.facebook.token)
      // FB.options({version: 'v2.8'})
      req.facebookClient = FB
      let profile = await new Promise((resolve, reject) => req.facebookClient.api(
        `/${req.user.facebook.id}/?fields=picture,name`, 'get', resolve))
      req.facebook_picture = profile.picture.data.url
      req.facebook_profile_name = profile.name
    }
    return next()
  })
}
