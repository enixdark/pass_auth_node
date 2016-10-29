let mongoose = require('mongoose')
let crypto = require('crypto')
const PEPPER = 'salt'
let userSchema = mongoose.Schema({
  local: {
    email: {type: String, default: null},
    password: {type: String, default: null},
    token: {type: String, default: null}
  },
  facebook: {
    id: {type: String, default: null},
    token: {type: String, default: null},
    email: {type: String, default: null},
    name: {type: String, default: null}
  },
  linkedin: {
    id: {type: String, default: null},
    token: {type: String, default: null},
    email: {type: String, default: null},
    name: {type: String, default: null}
  },
  twitter: {
    id: {type: String, default: null},
    token: {type: String, default: null},
    email: {type: String, default: null},
    name: {type: String, default: null}
  },
  google: {
    id: {type: String, default: null},
    token: {type: String, default: null},
    email: {type: String, default: null},
    name: {type: String, default: null}
  }
})

userSchema.methods.generateHash = async function(password) {
  let hash = await crypto.promise.pbkdf2(password, PEPPER, 4096, 512, 'sha256')
  return hash.toString('hex')
}

userSchema.methods.validatePassword = async function(password, type = 'local') {
  let hash = await crypto.promise.pbkdf2(password, PEPPER, 4096, 512, 'sha256')
  return hash.toString('hex') === this[type].password
}

userSchema.methods.generateToken = async function() {
  return crypto.randomBytes(64).toString('hex')
}

// Utility function for linking accounts
userSchema.methods.linkAccount = function(type, values) {
  // linkAccount('facebook', ...) => linkFacebookAccount(values)
  return this['link'+_.capitalize(type)+'Account'](values)
}

userSchema.methods.linkLocalAccount = function({email, password}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkFacebookAccount = function({account, token}) {
  // return this.linkAccount
}

userSchema.methods.linkTwitterAccount = function({account, token}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkGoogleAccount = function({account, token}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkLinkedinAccount = function({account, token}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.unlinkAccount = function(type) {
  throw new Error('Not Implemented.')
}

module.exports = mongoose.model('User', userSchema)
