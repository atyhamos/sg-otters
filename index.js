const fs = require('fs')
const axios = require('axios')
const { AsyncParser } = require('json2csv')

const fields = ['date', 'latitude', 'longitude']
const opts = { fields }
const transformOpts = { highWaterMark: 8192 }
const asyncParser = new AsyncParser(opts, transformOpts)

let csv = ''
asyncParser.processor
  .on('data', (chunk) => (csv += chunk.toString()))
  .on('end', () => fs.writeFileSync('./data.csv', csv))
  .on('error', (err) => console.error(err))

// const stream = fs.createWriteStream('./data.json')

const subtractDate = (date) => {
  const dateArr = date.split('-')
  const dayNumber = Number(dateArr[2])
  const monthNumber = Number(dateArr[1])
  const yearNumber = Number(dateArr[0])
  if (dayNumber === 1) {
    if (monthNumber === 1) {
      return [String(yearNumber - 1), String(12), String(31)].join('-')
    }
    return [dateArr[0], String(monthNumber - 1), String(31)].join('-')
  } else {
    return [dateArr[0], dateArr[1], String(dayNumber - 1)].join('-')
  }
}

const fetchOtterData = async () => {
  let isFetching = true
  let dateBefore = new Date().toISOString().slice(0, 10)
  while (isFetching) {
    console.log(`Fetching data from before ${dateBefore}`)
    await axios
      .get(
        `https://api.inaturalist.org/v1/observations?place_id=6734&taxon_id=41856&d2=${dateBefore}&per_page=200&order=desc&order_by=observed_on`
      )
      .then((response) => response.data)
      .then((data) => {
        if (!data.results.length) {
          isFetching = false
          console.log('reached the end')
          return
        }
        const report = data.results.map((result) => {
          return {
            date: result.observed_on_details.date,
            latitude: result.location.split(',')[0],
            longitude: result.location.split(',')[1],
          }
        })
        dateBefore = subtractDate(report[report.length - 1].date)
        // stream.write(JSON.stringify(report))
        asyncParser.input.push(JSON.stringify(report))
      })
  }
  // stream.end()
  asyncParser.input.push(null)
}

fetchOtterData()
