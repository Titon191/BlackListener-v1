const logger = require('./logger').getLogger('main:event', 'purple')
const c = require('./config.yml')
const _fs = require('fs')
const fs = _fs.promises
const os = require('os')
const share = require('./share')
const git = require('simple-git/promise')()
const args = require('./argument_parser')

const codeblock = code => '```' + code + '```'
const ucfirst = text => text.charAt(0).toUpperCase() + text.slice(1)

async function makeReport(client, error, type) {
  const date = new Date()
  const description = type === 'error'
    ? 'Unhandled Rejection(Exception/Error in Promise).'
    : 'Uncaught error.'
  const format = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}_${date.getHours()}.${date.getMinutes()}.${date.getSeconds()}`
  const argv = process.argv.map((val, index) => `arguments[${index}]: ${val}`)
  const commit = await git.revparse(['HEAD'])
  const data =  `
--- BlackListener ${ucfirst(type)} Report ---

Time: ${format}
Description: ${description}

${error.stack}

--- Process Details ---
    Last Called Logger Thread: ${share.thread} (may not current thread)

    BlackListener Version: ${c.version}
    BlackListener Commit: ${commit}

    Arguments: ${process.argv.length}
    ${argv.join('\n    ')}

    Launched in PID: ${process.pid}

    Remote control: ${args.rcon ? 'Enabled' : 'Disabled'}
    Custom Prefix: ${args.prefix || 'Disabled; using default value: '+c.prefix}

--- Discord.js ---
    Average ping of websocket: ${Math.floor(client.ping * 100) / 100}
    Last ping of websocket: ${client.pings[0]}
    Ready at: ${client.readyAt ? client.readyAt.toLocaleString() : 'Error on before getting ready'}

--- System Details ---
    CPU Architecture: ${process.arch}
    Platform: ${process.platform}
    Total Memory: ${Math.round(os.totalmem() / 1024 / 1024 * 100) / 100}MB
    Memory Usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024 * 100) / 100}MB

--- Versions ---
    Node Version: ${process.versions.node}
    HTTP Parser Version: ${process.versions.http_parser}
    v8 Version: ${process.versions.v8}
    Unicode Version: ${process.versions.unicode}
    zlib Version: ${process.versions.zlib}
    OpenSSL Version: ${process.versions.openssl}
`
  return {
    report: data,
    file: `./${type}-reports/${type}-${format}.txt`,
  }
}

module.exports = function() {
  const client = require('./index')
  let count = 0
  let once = false

  client.on('warn', (warn) => {
    logger.warn(`Got Warning from Client: ${warn}`)
  })

  client.on('disconnect', () => {
    logger.info(`Disconnected from Websocket (${count}ms).`)
    if (count === 0)
      logger.fatal('May wrong your bot token, Is bot token has changed or Base64 encoded?')
        .info('Or are you attempted remote shutdown?')
    process.exit()
  })

  client.on('reconnecting', () => {
    logger.warn('Got Disconnected from Websocket, Reconnecting!')
  })

  process.on('unhandledRejection', async (error = {}) => {
    if (error.name === 'DiscordAPIError') return true // if DiscordAPIError, just ignore it(e.g. Missing Permissions)
    const { report, file } = await makeReport(client, error, 'error')
    client.readyAt ? client.channels.get('484357084037513216').send(codeblock(report))
      .then(() => logger.info('Error report has been sent!')) : true
    logger.error(`Unhandled Rejection: ${error}`)
    logger.error(error.stack)
    fs.writeFile(file, report, 'utf8').then(() => {
      logger.info(`Error Report has been writed to ${file}`)
    })
  })

  process.on('uncaughtException', async (error = {}) => {
    const { report, file } = await makeReport(client, error, 'crash')
    logger.emerg('Oh, BlackListener has crashed!')
      .emerg(`Crash report has writed to: ${file}`)
    _fs.writeFileSync(file, report, 'utf8')
    client.readyAt ? client.channels.get('484183865976553493').send(codeblock(report))
      .finally(() => process.exit(1)) : process.exit(1)
  })

  process.on('message', msg => {
    if (msg === 'heartbeat') process.send('ping')
  })

  client.on('rateLimit', (info, method) => {
    logger.error('==============================')
      .error('      Got rate limiting!      ')
      .error(` -> ${info.limit} seconds remaining`)
      .error(` Detected rate limit while processing '${method}' method.`)
      .error(` Rate limit information: ${JSON.stringify(info)} `)
      .error('==============================')
  })

  client.on('guildCreate', () => {
    client.user.setActivity(`${c.prefix}help | ${client.guilds.size} guilds`)
  })

  process.on('SIGINT', () => {
    setInterval(() => {
      if (count <= 5000) {
        ++count
      } else { clearInterval(this) }
    }, 1)
    setTimeout(() => {
      logger.info('Exiting')
      process.exit()
    }, 5000)
    if (count != 0)
      if (!once) {
        logger.info('Caught INT signal')
        logger.info('Disconnecting')
        client.destroy()
        once = true
      } else {
        logger.info('Already you tried CTRL+C. Program will exit at time out(' + (5000 - count) / 1000 + ' seconds left) or disconnected')
      }
  })
}

logger.info('Registered all events.')