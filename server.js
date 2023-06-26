// gif manip: https://www.npmjs.com/package/gifsicle
const http = require('node:http')
const path = require('path')
const fs = require('fs')
const jimp = require('jimp')

require('dotenv').config()

/*
 * Routes:
 * /:width/:height - returns images/source/<domain> images
 * /c/:width/:height - returns "crazy" images/source/<domain>/crazy images
 * /g/:width/:height - returns "grayscale" images/source/<domain> images grayscale processed
 * /gif/:width/:height - returns "gif" images/source/<domain>/gifs images
 *
 * Max side dimension is 3500
 * Throw error if side dimension is zero
 * Return square image if only one dimension
 */

const domains = ['placecage', 'fillmurray', 'radfaces', 'stevensegallery']
const imageExts = ['gif', 'jpg', 'jpeg', 'png']

const sourceImagePath = path.join(__dirname, 'images', 'source')
const generatedImagePath = path.join(__dirname, 'images', 'generated')

const radFaces = fs.readFileSync(path.join(__dirname, 'radfaces', 'radfaces.json'))
const standardImages = domains.reduce((images, domain) => {
  const files = fs.readdirSync(path.join(sourceImagePath, domain))
  images[domain] = files.filter((file) => imageExts.includes(path.extname(file).replace(/^\./, '')))
  return images
}, {})
const crazyImages = fs.readdirSync(path.join(sourceImagePath, 'placecage', 'crazy')).filter((file) => imageExts.includes(path.extname(file).replace(/^\./, '')))
const gifImages = fs.readdirSync(path.join(sourceImagePath, 'placecage', 'gifs')).filter((file) => imageExts.includes(path.extname(file).replace(/^\./, '')))

const randomImageFrom = (domain) => {
  return standardImages[domain][~~(Math.random() * standardImages[domain].length)]
}

const randomCrazyImage = () => {
  return crazyImages[~~(Math.random() * crazyImages.length)]
}
const randomGifImage = () => {
  return gifImages[~~(Math.random() * gifImages.length)]
}

const getImagePath = ({ domain = 'placecage', gif = false, grayscale = false, crazy = false } = {}) => {
  const parts = [sourceImagePath, domain]
  if (gif) {
    return path.join(...parts, 'gifs', randomGifImage())
  }
  if (crazy) {
    return path.join(...parts, 'crazy', randomCrazyImage())
  }
  return path.join(...parts, randomImageFrom(domain, ''))
}

const serveIndexFor = (domain, res) => {
  const filePath = path.join(__dirname, domain, 'index.html')
  console.log(filePath)
  const index = fs.readFileSync(filePath)
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(index)
}

const serveStylesheet = (res) => {
  const css = fs.readFileSync(path.join(__dirname, 'content', 'global.css'))
  res.writeHead(200, { 'Content-Type': 'text/css' })
  res.end(css)
}

const radFacesJSON = (res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(radFaces)
}

const radFacesImage = (filename, res) => {
  res.writeHead(200, { 'Content-Type': 'image/jpeg' })
  res.end(fs.readFileSync(path.join(sourceImagePath, 'radfaces', filename)))
}

const radFacesAsset = (pathParts, res) => {
  const filePath = path.join(__dirname, 'radfaces', ...pathParts)
  const contentType = /css$/.test(filePath) ? 'text/css' : 'image/png'
  console.log(filePath)
  res.writeHead(200, { 'Content-Type': contentType })
  res.end(fs.readFileSync(filePath))
}

const server = http.createServer((req, res) => {
  console.log(`[HTTP GET]: ${req.url}`)

  // Shared CSS
  if (/global\.css$/.test(req.url)) {
    return serveStylesheet(res)
  }

  // Use placecage as root
  if (req.url === '/') {
    return serveIndexFor('placecage', res)
  }

  // Rad faces JSON
  if (req.url === '/radfaces/radfaces.json') {
    return radFacesJSON(res)
  }

  const urlParts = req.url.replace(/^\//, '').split('/')
  const opts = {
    domain: 'placecage',
    grayscale: false,
    crazy: false,
    gif: false,
  }
  const domain = urlParts[0]

  if (domains.includes(domain)) {
    opts.domain = domain
    urlParts.shift()
  }

  if (!urlParts[0]) {
    return serveIndexFor(domain, res)
  }

  if (domain === 'radfaces') {
    if (/jpg$/.test(req.url)) {
      return radFacesImage(urlParts[0], res)
    }
    return radFacesAsset(urlParts, res)
  }

  const [next] = urlParts
  if (isNaN(+next)) {
    opts.grayscale = urlParts[0] === 'g'
    opts.crazy = urlParts[0] === 'c'
    opts.gif = urlParts[0] === 'gif'
    urlParts.shift()
  }
  const [width, height] = urlParts

  const img = getImagePath({...opts, width, height: height || width})

  if (/gif$/.test(img)) {
    res.writeHead(200, { 'Content-Type': 'image/gif' })
    res.end(fs.readFileSync(img))
    return
  }
  jimp.read(fs.readFileSync(img), (err, blob) => {
    if (err) {
      res.writeHead(500)
      res.end(err)
    }
    if (width) {
      blob.cover(+width, +height || +width)
    }
    if (opts.grayscale) {
      blob.color([{ apply: 'greyscale', params: [0] }])
    }
    blob.getBufferAsync(jimp.MIME_JPEG).then((file) => {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' })
      res.end(file)
    })
  })
})

console.log(`Server listening on port ${process.env.PORT}`)
server.listen(process.env.PORT || 80)
