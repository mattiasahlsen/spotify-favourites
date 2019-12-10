const resolved = new Promise((res, rej) => res())

resolved.then(() => {
  console.log('wtf')
  throw new Error('wtf')
}).catch(err => {
  console.log('wtf again')
  console.log(err)
})
