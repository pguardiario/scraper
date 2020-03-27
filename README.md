# scraper
A tool for scraping websites
```
npm install pguardiario/scraper
const scraper = require('scraper')

; (async() => {
  # scrape a page
  let page = await scraper.get('http://www.amazon.com/')
  console.log(page.search('a').hrefs)
  console.log(page.search('a').texts)
  # save a csv
  scraper.save({foo: "bar"}, 'x.csv')
})
