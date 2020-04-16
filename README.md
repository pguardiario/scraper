# scraper
A tool for scraping websites
```
npm install pguardiario/scraper
const scraper = require('scraper')
```
# scrape a page
```
let page = await scraper.get('http://www.amazon.com/')
console.log(page.search('a').hrefs)
console.log(page.search('a').texts)
```

# use session (keep track of cookies)
```
const session = scraper.session()
session.get(url)
```

# save a csv
```
scraper.save({foo: "bar"}, 'x.csv')
```

# load a csv
```
await scraper.loadCsv(path)
```

