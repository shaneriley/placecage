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

const domains = ['placecage', 'fillmurray', 'stevensegallery']
const imageExts = ['gif', 'jpg', 'jpeg', 'png']

const sourceImagePath = path.join(__dirname, 'images', 'source')
const standardImages = domains.reduce((images, domain) => {
  const files = fs.readdirSync(path.join(sourceImagePath, domain))
  images[domain] = files.filter((file) => imageExts.includes(path.extname(file).replace(/^\./, '')))
  return images
}, {})

const randomImageFrom = (domain) => {
  return standardImages[domain][~~(Math.random() * standardImages[domain].length)]
}

const getImagePath = ({ domain = 'placecage', width, height, grayscale = false, crazy = false } = {}) => {
  return path.join(sourceImagePath, domain, randomImageFrom(domain, ''))
}

const serveIndexFor = (domain, res) => {
  const index = fs.readFileSync(path.join(__dirname, domain, 'index.html'))
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(index)
}

const serveStylesheet = (res) => {
  const css = fs.readFileSync(path.join(__dirname, 'content', 'global.css'))
  res.writeHead(200, { 'Content-Type': 'text/css' })
  res.end(css)
}

const server = http.createServer((req, res) => {
  if (/\.css$/.test(req.url)) {
    return serveStylesheet(res)
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

  const [next] = urlParts
  if (isNaN(+next)) {
    opts.grayscale = urlParts[0] === 'g'
    opts.crazy = urlParts[0] === 'c'
    opts.gif = urlParts[0] === 'gif'
    urlParts.shift()
  }
  const [width, height] = urlParts

  const img = getImagePath({...opts, width, height: height || width})

  jimp.read(fs.readFileSync(img), (err, blob) => {
    if (err) {
      res.writeHead(500)
      res.end(err)
    }
    if (width) {
      blob.cover(+width, +height || +width).getBufferAsync(jimp.MIME_JPEG).then((file) => {
        res.writeHead(200, { 'Content-Type': 'image/jpeg' })
        res.end(file)
      })
    }
    else {
      blob.getBufferAsync(jimp.MIME_JPEG).then((file) => {
        res.writeHead(200, { 'Content-Type': 'image/jpeg' })
        res.end(file)
      })
    }
  })
})

console.log(`Server listening on port ${process.env.PORT}`)
server.listen(process.env.PORT || 80)
