let Twitter = require('twitter')
module.exports = (app) => {
  return (req, res, next) => {
    if(req.user.twitter){
      req.twitterClient = new Twitter({
        consumer_key: app.config.twitter.consumerKey,
        consumer_secret: app.config.twitter.consumerSecret,
        access_token_key: req.user.twitter.token,
        access_token_secret: req.user.twitter.secret
      })
    }
    return next()
  }

}
