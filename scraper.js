const fb = require('fake-browser')
const cheerio = require('cheerio')
const csv = require('csvtojson')
const fs = require('fs')
const csvWriter = require('csv-write-stream')
var tough = require('tough-cookie')
var Cookie = tough.Cookie

const clean = (s) => s.trim().replace(/\s+/g, ' ')
class List {
  constructor(css, $, node) {
    this.$ = $
    this.elements = (node ? this.$(node).find(css) : this.$(css) ).get().map(el => new Element(el, this.$))

    this[Symbol.iterator] = () => {
      return {
        current: 0,
        last: this.elements.length - 1,
        elements: this.elements,
        next() {
          if (this.current <= this.last) {
            return { done: false, value: this.elements[this.current++] };
          } else {
            return { done: true };
          }
        }
      }
    }

    return new Proxy(this, {
      get: (obj, key) => {
        if(key === Symbol.iterator){
          return obj[key]
        }
        let match = typeof (key) === 'string' ? key.match(/(.*)s$/) : false
        switch(true){
          case key === 'elements':
            return obj.elements
          case key === 'length':
            return obj.elements.length
          case typeof (key) === 'string' && (Number.isInteger(Number(key))):
            return this.elements[Number(key)]
          case key === 'map':
            return (f) => this.elements.map(f)
          case key === 'each':
            (f) => this.elements.map(f)
            return
          case !!match:
            return this.elements.map(el => el[match[1]])
          default:
            throw obj[key].bind(obj)
        }
      }
    })
  }
}

class Element {
  constructor(node, $) {
    this.node = node
    this.$ = $
    return new Proxy(this, {
      get: (obj, key)        => {
        switch(key){
          case 'text':
            return clean(this.$(this.node).text())
          case 'html':
            return this.$(this.node).html().trim()
          case 'texts':
            return this.$(this.node)[0].children.filter(s => s.type === 'text').map(s => clean(s.data))
          case 'children':
            return this.$(this.node)[0].children
          case 'search':
            return (css) => new List(css, obj.$, obj.node)
          case 'at':
            return (css) => new List(css, obj.$, obj.node)[0]
          default:
            return this.$(this.node).attr(key)
        }
      },
      set: (obj, key, value) => this.$(this.node).attr(key, value)
    })
  }
}

class Page {
  constructor(html, url) {
    this.url = url
    this.body = html
    this.$ = cheerio.load(html)
    // no more relative links
    let el = this.at('base[href]')
    let base = el ? el.href : url
    try {
      this.search('a[href]').map(a => a.href = new URL(a.href, base).href)
    } catch(e) {
      // debugger
    }

    this.title = this.at('title').text
  }

  search(css) {
    return new List(css, this.$)
  }

  at(css) {
    return this.search(css)[0]
  }


}

class Scraper {
  constructor() {
    this.csvs = {}
    this._visited = new Set()
  }

  visited(str) {
    if(this._visited.has(str)) return true
    this._visited.add(str)
    return false
  }

  async save(item, fn = 'output.csv') {
    if (this.csvs[fn] === undefined) {
      this.csvs[fn] = csvWriter()
      this.csvs[fn].pipe(fs.createWriteStream(fn))
    }
    this.csvs[fn].write(item)
  }

  async loadCsv(path) {
    return await csv().fromFile(path)
  }

  async doHeaders(url, headers) {


    let cookie, value
    for(value of (headers['set-cookie'] || [])){
      cookie = Cookie.parse(value)
      await new Promise((resolve, reject) => this.cookiejar.setCookie(cookie, url, resolve))
    }
  }

  async cookiesFor(url) {
    return this.isSession ? await new Promise((resolve, reject) => {
      this.cookiejar.getCookies(url, (err, cookies) => {
        resolve(cookies.map(c => `${c.key}=${c.value}`))
      })
    }) : []
  }

  async get(url, options={}) {
    let cached, response
    if(options.cache){
      if(cached = await options.cache.find({ _id: url })){
        response = cached.response
      }
    }

    if(!response){
      let cookies = await this.cookiesFor(url)
      response = await fb.get(url, {...options, cookies})
      if(options.cache){
        await options.cache.update(url, { response })
      }
    }

    await this.doHeaders(url, response.headers)

    if (response.headers['content-type'] && response.headers['content-type'].match(/html/)) {
      return new Page('' + response.data, url)
    } else {
      return response.data
    }
  }

  session() {
    const ret = new Scraper()
    ret.isSession = true


    ret.cookiejar = new tough.CookieJar()

    return ret
  }

  pageFrom(body, url) {
    return new Page(body, url)
  }
}

module.exports = new Scraper()

// ;(async() => {
//   let s = new Scraper().session()
//   await s.get('https://www.amazon.com/Jutland-Unfinished-Personal-History-Controversy-ebook/dp/B01LXCAJJ1/')
//   let page = await s.get('https://www.amazon.com/Jutland-Unfinished-Personal-History-Controversy-ebook/dp/B01LXCAJJ1/')

//   debugger
// })()