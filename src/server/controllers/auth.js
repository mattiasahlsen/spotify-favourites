const express = require('express')
const fetch = require('node-fetch')
const router = express.Router()
const config = require('../config')
const queryString = require('querystring')

const generateRandomString = length => {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

const redirectUri = config.server + '/callback'

const stateKey = 'spotify_auth_state'
const accessTokenKey = 'spotify_access_token'
const refreshTokenKey = 'spotify_refresh_token'


router.get('/login', (req, res) => {

  const state = generateRandomString(16)
  res.cookie(stateKey, state);

  const scope = 'user-read-private user-read-email user-top-read'
  return res.redirect('https://accounts.spotify.com/authorize?' +
    queryString.stringify({
      response_type: 'code',
      client_id: config.clientId,
      scope: scope,
      redirect_uri: redirectUri,
      state: state
    }))
})


router.get('/callback', (req, res) => {
  const code = req.query.code || null
  const state = req.query.state || null
  const storedState = req.cookies ? req.cookies[stateKey] : null

  if (state === null || state !== storedState) {
    return res.redirect(config.origin + '?' + 
      queryString.stringify({
        error: 'state_mismatch'
      }))
  } else {
    res.clearCookie(stateKey);

    const formData = new URLSearchParams()
    formData.append('grant_type', 'authorization_code')
    formData.append('code', code)
    formData.append('redirect_uri', redirectUri)


    return fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' +
          new Buffer(config.clientId + ':' + config.clientSecret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    }).then(async resp => {
      if (req.query.error === 'access_denied') return res.redirect(401, config.origin)
      if (resp.status !== 200) {
        console.log('Spotify bad status when fetching token: ' + resp.status)
        return res.redirect(500, config.origin)
      }
      try {
        const data = await resp.json()
        const accessToken = data.access_token
        const refreshToken = data.refresh_token

        if (!accessToken || !refreshToken) {
          return res.redirect(config.origin + '?' + 
            queryString.stringify({
              error: 'authentication_failure'
            }))
        }

        res.cookie(accessTokenKey, accessToken);
        res.cookie(refreshTokenKey, refreshToken);
        return res.redirect(config.origin)
      } catch (err) {
        res.redirect(500, config.origin)
        console.log(err)
      }
    })
  }
})

router.get('/refreshToken', function(req, res) {
  // requesting access token from refresh token
  const refreshToken = req.cookies ? req.cookies[refreshTokenKey] : null

  if (!refreshToken) {
    console.log('No refresh token.')
    return res.status(401).end()
  }

  const formData = new URLSearchParams()
  formData.append('grant_type', 'refresh_token')
  formData.append('refresh_token', refreshToken)

  return fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' +
        new Buffer(config.clientId + ':' + config.clientSecret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  }).then(async resp => {
    if (req.query.error === 'access_denied') return res.redirect(401, config.origin)
    if (resp.status !== 200) {
      console.log('Spotify bad status when refreshing token: ' + resp.status)
      return res.redirect(500, config.origin)
    }
    try {
      const data = await resp.json()
      const accessToken = data.access_token

      if (!accessToken) {
        console.log('No access token')
        return res.status(500).end()
      }

      res.cookie(accessTokenKey, accessToken);
      return res.json({accessToken})
    } catch (err) {
      res.status(500).end()
      console.log(err)
    }
  })
})

router.get('/accessToken', (req, res, next) => {
  const accessToken = req.cookies ? req.cookies[accessTokenKey] : null
  if (accessToken) return res.json({accessToken})
  else return res.status(401).end()
})

router.get('/logout', (req, res, next) => {
  res.clearCookie(accessTokenKey)
  res.end()
})

module.exports = router
