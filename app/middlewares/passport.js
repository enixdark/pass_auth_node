let passport = require('passport')
let wrap = require('nodeifyit')
let User = require('../models/user')
let LocalStrategy = require('passport-local').Strategy
let FacebookStrategy = require('passport-facebook').Strategy
let TwitterStrategy = require('passport-twitter').Strategy
// let GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var GoogleStrategy = require('passport-google-oauth20').Strategy
var LinkedInStrategy = require('passport-linkedin-oauth2').Strategy
// Handlers
async function localAuthHandler(req, email, password, done) {
  let user = await User.promise.findOne({ 'local.email': email})
  if (!user || email !== user.local.email) {
    return [false, {message: 'Invalid username'}]
  }

  if (!await user.validatePassword(password)) {
    return [false, {message: 'Invalid password'}]
  }
  user.local.token = await user.generateToken()
  return user.save()
}

async function localSignupHandler(req, email, password, done) {
  email = (email || '').toLowerCase()
  // Is the email taken?
  if (await User.promise.findOne({email})) {
    return [false, {message: 'That email is already taken.'}]
  }

  // create the user
  let user = new User()
  user.local.email = email
  // Use a password hash instead of plain-text
  user.local.password = await user.generateHash(password)
  return await user.save()
}



// async function localLoginHandler(email,password){
//   email = (email || '').toLowerCase()
//   if (! (await User.promise.findOne({email})) ) {
//     return [false, {message: 'email not exists'}]
//   }
//   let password_hash = await user.generateHash(password)
//   if(await user.password === password_hash){
//     return [true, {message: `user ${email} login success`}]
//   }
//   return [false, {message: 'password or username incorrect'}]
// }

// 3rd-party Auth Helper
function loadPassportStrategy(OauthStrategy, config, userField) {
  config.passReqToCallback = true
  passport.use(new OauthStrategy(config, wrap(authCB, {spread: true})))

  async function authCB(req, token, _ignored_, account) {
      // 1. Load user from store by matching user[userField].id && account.id
      // 2. If req.user exists, we're authorizing (linking account to an existing user)
      // 2a. Ensure it's not already associated with another user
      // 2b. Link account
      // 3. If req.user !exist, we're authenticating (logging in an existing user)
      // 3a. If Step 1 failed (existing user for 3rd party account does not already exist), create a user and link this account (Otherwise, user is logging in).
      // 3c. Return user
      debugger
      let user = req.user
      if(!user){
        let field = `${userField}.id`
        user = await User.promise.findOne({[field]: account.id})
      }
      user = user ? user : new User()
      debugger
      user[userField] = {
        email: account.email ? account.email : "email@gmail.com",
        name: account.displayName,
        id:  account.id,
        token: token
      }
      return await user.save()
  }
}

function configure(CONFIG) {
  // Required for session support / persistent login sessions
  passport.serializeUser(wrap(async (user) => user._id))
  passport.deserializeUser(wrap(async (id) => {
    return await User.promise.findById(id)
  }))

  /**
   * Local Auth
   */
  // let localStrategy = new LocalStrategy({
  //   usernameField: 'email', // Use "email" instead of "username"
  //   failureFlash: true // Enable session-based error logging
  // }, wrap(localAuthHandler, {spread: true}))
  let localSignupStrategy = new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    failureFlash: true,
    session: false,
    passReqToCallback: true
  }, wrap(localSignupHandler, {spread: true}))

  let localLoginStrategy = new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    failureFlash: true,
    session: false,
    passReqToCallback: true
  }, wrap(localAuthHandler, {spread: true}))

  // passport.use(localLoginStrategy)
  passport.use('local-login', localLoginStrategy)
  passport.use('local-signup', localSignupStrategy)
  loadPassportStrategy(FacebookStrategy, {
    clientID: CONFIG.facebook.consumerKey,
    clientSecret: CONFIG.facebook.consumerSecret,
    callbackURL: CONFIG.facebook.callbackUrl
  }, 'facebook')

  loadPassportStrategy(TwitterStrategy, {
    consumerKey: CONFIG.twitter.consumerKey,
    consumerSecret: CONFIG.twitter.consumerSecret,
    callbackURL: CONFIG.twitter.callbackUrl
  }, 'twitter'),

  loadPassportStrategy(GoogleStrategy, {
    clientID: CONFIG.google.clientID,
    clientSecret: CONFIG.google.clientSecret,
    callbackURL: CONFIG.google.callbackUrl,
    accessType: 'offline' 
  }, 'google')

  loadPassportStrategy(LinkedInStrategy, {
    clientID: CONFIG.linkedin.clientID,
    clientSecret: CONFIG.linkedin.clientSecret,
    callbackURL: CONFIG.linkedin.callbackUrl,
    scope: ['r_emailaddress', 'r_basicprofile'],
    state: true
  }, 'linkedin')
  /**
   * 3rd-Party Auth
   */

  // loadPassportStrategy(LinkedInStrategy, {...}, 'linkedin')
  // loadPassportStrategy(FacebookStrategy, {...}, 'facebook')
  // loadPassportStrategy(GoogleStrategy, {...}, 'google')
  // loadPassportStrategy(TwitterStrategy, {...}, 'twitter')

  return passport
}

module.exports = {passport, configure}
