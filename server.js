const app = require('express')()
const http = require('http').createServer(app)
const exphbs = require('express-handlebars')
const port = 3000
const Serialport = require('serialport')

let globalSocket, sp

const io = require('socket.io')(http)

app.engine('handlebars', exphbs())
app.set('view engine', 'handlebars')

io.on('connection', function (socket) {
  console.log('connected')
  socket.on('xy', (data) => {
    const output = {
      pos: {
        x: data.pos.x,
        y: data.pos.y
      }
    }
    if (sp && sp.isOpen) {
      sp.write(JSON.stringify(output), function (err, results) {
        console.log('err ' + err)
        console.log('results ' + results)
      })
    } else {
      console.info(output)
    }
  })
  globalSocket = socket
})

app.get('/', (req, res) => {
  res.render('index')
})

app.get('/xy', (req, res) => {
  res.render('xy')
})

app.get('/list', async (req, res) => {
  const serialPorts = await Serialport.list()
  const ports = []
  serialPorts.forEach((port) => {
    ports.push(port.path)
  })
  return res.send(ports.join(', '))
})

app.get('/connect', async (req, res) => {
  const serialPorts = await Serialport.list()
  serialPorts.forEach((port) => {
    if (port.manufacturer && port.manufacturer.includes('Arduino')) {
      console.info(port)
      sp = port
      sp.update({ baudrate: 9600 }, (err) => { console.error(err) })
      sp.open(serialConnectError)
      Socket2Serial()
      return res.sendStatus(200)
    } else {
      console.log(port)
    }
  })
})

app.get('/disconnect', (req, res) => {
  sp.close(serialConnectError)
  return res.sendStatus(200)
})

const Socket2Serial = () => {
  sp.on('open', function () {
    console.log('Serial connectioin opened')

    sp.on('data', function (data) {
      if (IsJsonString(data)) {
        const jsonData = JSON.parse(data)
        if (globalSocket !== 'undefined') {
          console.log(jsonData)
          globalSocket.emit('coord', jsonData)
        }
      }
    })
  })
}

const serialConnectError = (err) => {
  console.error(err)
}

// Start the server
http.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

function IsJsonString (str) {
  try {
    JSON.parse(str)
  } catch (e) {
    return false
  }
  return true
}
