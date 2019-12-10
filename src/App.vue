<template>
  <div id="app">
    <div class="nav">
      <div v-if="accessToken && userData" class="nav-content">
        <button class="btn btn-secondary" @click="logout">LOG OUT</button>
        <p class="username">{{userData.id}}</p>
        <img v-if="userData.images" class="user-image" :src="userData.images[0].url">
      </div>
    </div>
    <div class="container">
      <a v-if="!accessToken && !loadingToken" class="btn btn-primary btn-auth" :href="server + '/login'">AUTHENTICATE</a>
      <div class="content" v-else-if="accessToken">
        <clip-loader
          color="#1cca59"
          v-if="(view === TRACKS && loadingTracks) || (view === ARTISTS && loadingArtists)" :loading="true"
        ></clip-loader>
        <div v-else class="spacing">
          <form class="selects">
            <select v-model="view" class="">
              <option :value="TRACKS">Your top tracks</option>
              <option :value="ARTISTS">Your top artists</option>
            </select>
            <select v-model="timeRange">
              <option :value="SHORT_TERM">Last 4 weeks</option>
              <option :value="MEDIUM_TERM">Last 6 months</option>
              <option :value="LONG_TERM">All time</option>
            </select>
          </form>
          <div class="items" v-if="view === TRACKS && topTracks">
            <div class="item-container" v-for="track in topTracks" :key="track.id">
              <div class="item track">
                <div class="item-left">
                  <h1>{{track.name}}</h1>
                  <h2 v-for="artist in track.artists" :key="artist.id">{{artist.name}}</h2>
                  <p class="popularity">Popularity on Spotify: <strong :style="{ color: popularity(track.popularity) }">{{track.popularity}}</strong></p>
                </div>
                <div>
                  <img :src="track.album.images[2].url">
                </div>
              </div>
            </div>
          </div>

          <div class="items" v-else-if="view === ARTISTS && topArtists">
            <div class="item-container" v-for="artist in topArtists" :key="artist.id">
              <div class="item artist">
                <div class="item-left">
                  <h1>{{artist.name}}</h1>
                  <h2 v-for="genre in artist.genres" :key="genre">{{genre}}</h2>
                  <p class="popularity">Popularity on Spotify: <strong :style="{ color: popularity(artist.popularity) }">{{artist.popularity}}</strong></p>
                </div>
                <div>
                  <img :src="artist.images[2].url">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const serverConfig = require('./server/config')
import ClipLoader from 'vue-spinner/src/ClipLoader.vue'

const pass = () => {}

const TRACKS = 'top-tracks'
const ARTISTS = 'top-artists'
const SHORT_TERM = 'short_term'
const MEDIUM_TERM = 'medium_term'
const LONG_TERM = 'long_term'

const timeRanges = {}
timeRanges[SHORT_TERM] = null
timeRanges[MEDIUM_TERM] = null
timeRanges[LONG_TERM] = null

const development = process.env.NODE_ENV === 'development'

export default {
  name: 'app',
  components: {
    ClipLoader,
  },
  data() {
    return {
      accessToken: null,

      userData: null,
      topTracksData: { ...timeRanges },
      topArtistsData: { ...timeRanges },

      view: TRACKS,
      TRACKS,
      ARTISTS,

      timeRange: MEDIUM_TERM,
      SHORT_TERM,
      MEDIUM_TERM,
      LONG_TERM,

      accessTokenPromise: null,
      topTracksPromise: { ...timeRanges },
      topArtistsPromise: { ...timeRanges },

      server: development ? serverConfig.server : serverConfig.origin,
    }
  },
  computed: {
    topTracks() {
      if (!this.topTracksData[this.timeRange]) this.fetchTopTracks()
      return this.topTracksData[this.timeRange]
    },
    topArtists() {
      if (!this.topArtistsData[this.timeRange]) this.fetchTopArtists()
      return this.topArtistsData[this.timeRange]
    },
    spotifyFetchOptions() {
      return {
        headers: {
          'Authorization': 'Bearer ' + this.accessToken
        }
      }
    },
    serverFetchOptions() {
      return {
        credentials: 'include'
      }
    },
    loadingToken() {
      return this.accessTokenPromise !== null
    },
    loadingTracks() {
      return this.topTracksPromise[this.timeRange] !== null
    },
    loadingArtists() {
      return this.topArtistsPromise[this.timeRange] !== null
    }
  },
  created() {
    this.fetchAccessToken().then(this.fetchUserData).catch(pass)
  },
  methods: {
    fetchAccessToken(refresh) {
      if (!this.accessTokenPromise) {
        this.accessTokenPromise = fetch(
          this.server + (refresh ? '/refreshToken' : '/accessToken'),
          this.serverFetchOptions
        ).then(async resp => {
          if (resp.status === 200) {
            const data = await resp.json()
            this.accessToken = data.accessToken
            return this.accessToken
          } else if (resp.status === 401 ) {
            throw new Error('Not authorized.')
          } else throw new Error('Unknown error when feching access token.')
        }).finally(() => this.accessTokenPromise = null)
        return this.accessTokenPromise
      } else return this.accessTokenPromise
    },
    refreshAccessToken() {
      return this.fetchAccessToken(true)
    },
    fetchUserData() {
      return fetch('https://api.spotify.com/v1/me', this.spotifyFetchOptions).then(async resp => {
        if (resp.status === 200) {
          const data = await resp.json()
          this.userData = data
        } else if (resp.status === 401) this.refreshAccessToken().then(this.fetchUserData)
      })
    },
    fetchTopTracks() {
      const timeRange = this.timeRange
      const url = 'https://api.spotify.com/v1/me/top/tracks?time_range=' + timeRange
      this.topTracksPromise[timeRange] = fetch(url, this.spotifyFetchOptions).then(async resp => {
        if (resp.status === 200) {
          const data = await resp.json()
          this.topTracksData[timeRange] = data.items
        } else if (resp.status === 401) this.refreshAccessToken().then(this.fetchTopTracks)
          .catch(err => console.log('Error fetching refresh token.'))
      }).finally(() => this.topTracksPromise[timeRange] = null)
      return this.topTracksPromise[timeRange]
    },
    fetchTopArtists() {
      const timeRange = this.timeRange
      const url = 'https://api.spotify.com/v1/me/top/artists?time_range=' + timeRange
      this.topArtistsPromise[timeRange] = fetch(url, this.spotifyFetchOptions).then(async resp => {
        if (resp.status === 200) {
          const data = await resp.json()
          this.topArtistsData[timeRange] = data.items
        } else if (resp.status === 401) this.refreshAccessToken().then(this.fetchTopArtists)
          .catch(err => console.log('Error fetching refresh token.'))
      }).finally(() => this.topArtistsPromise[timeRange] = null)
      return this.topArtistsPromise[timeRange]
    },
    logout() {
      fetch(this.server + '/logout', this.serverFetchOptions).then(resp => {
        this.accessToken = null
      })
    },
    popularity(percent) {
      const red = 255 * (1 - percent / 100)
      const green = 255 * percent / 100
      return `rgb(${red}, ${green}, 0)`
    }
  }
}
</script>

<style>
select {
  border: 1px solid #0F0F0F;
  border-radius: 0;
  padding: 0.3em;
  font-size: 1.2em;
  font-weight: 300;
  margin-bottom: 0.5%;
  resize: none;
}
select:hover {
  cursor: pointer;
}

body {
  margin: 0;
  padding: 0;
}
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  font-family: 'Montserrat', sans-serif;
  text-align: center;

  background-color: #0F0F0F;
  color: #f2f2f2;

  display: flex;
  flex-direction: column;
  align-items: stretch;

  min-height: 100vh;
}

.spacing {
  margin: 0.5em;
}
.spacing-right {
  margin-right: 0.25em;
}

.nav {
  display: flex;
  padding: 1em 2em;
  height: 3em;
  justify-content: flex-end;
  align-items: center;
}
.nav-content {
  display: flex;
  flex-direction: row;
  height: 100%;
  align-items: center;
}

.username {
  margin-right: 0.5em;
}
.user-image {
  height: 100%;
  border-radius: 50%;
}

.btn {
  border-radius: 1em;
  padding: 0.75em;
  display: inline-block;
  font-weight: bold;
  text-decoration: none;
  margin: 1em;
  cursor: pointer;
  border: none;
  transition: background-color 0.25s ease, color 0.25s ease;
}
.btn-primary {
  background-color: #1cca59;
  color: #f2f2f2;
}
.btn-primary:hover {
  background-color: #159d45;
}
.btn-secondary {
  background-color: #0F0F0F;
  color: #f2f2f2;
  border: 2px solid #f2f2f2;
}
.btn-secondary:hover {
  color: #0F0F0F;
  background-color: #f2f2f2;
}
.btn-auth {
  font-size: 1.5em;
}

.content {
  max-width: 100%;
}

.items {
  display: flex;
  flex-direction: column;
}
.item-container {
  background-color: #262626;
  padding: 0.5em;
  margin: 0.5em 0;
  border-radius: 0.5em;
}
.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: auto;
}
.item-left {
  margin-right: 1em;
}
.item h1 {
  margin: 0.2em 0;
  font-size: 1.3em;
}
.item h2 {
  margin: 0;
  font-size: 1.1em;
}
.item img {
  border-radius: 0.25em;
  width: 64px;
}
.item .popularity {
  font-size: 1.1em;
  margin-top: 0.5em;
}

.container {
  margin-left: auto;
  margin-right: auto;

  flex: 1;
  text-align: left;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.selects {
  display: inline-flex;
  flex-wrap: wrap;
}
.selects select {
  flex: 1 0 auto;
}

@media (max-width: 539px) {
  .container {
    width: 100%;
  }
}
@media (min-width: 540px) {
  .container {
    width: 90%;
  }
}
@media (min-width: 720px) {
  .container {
    width: 80%;
  }
}
@media (min-width: 960px) {
  .container {
    width: 70%;
  }
}
@media (min-width: 1140px) {
  .container {
    width: 60%;
  }
}

</style>
