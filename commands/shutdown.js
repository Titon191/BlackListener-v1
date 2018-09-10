const logger = require('../logger').getLogger('commands:shutdown', 'darkgray')
const f = require('string-format')
const cs = require('../config/ConfigStore')

module.exports.args = '[-f]'

module.exports.name = 'shutdown'

module.exports.isAllowed = (msg, owners) => {
  return owners.includes(msg.author.id)
}

module.exports.run = function(msg, settings, lang) {
  const args = msg.content.replace(settings.prefix, '').split(' ')
  const client = msg.client
  if (args[1] == '-f') {
    logger.info(f(lang.atmpfs, msg.author.tag))
    msg.channel.send(lang.bye)
    client.destroy()
    cs.store()
    require('fs').unlinkSync('../blacklistener.pid')
  } else if (args[1] == '-r') {
    (async () => {
      logger.info(f(lang.rebooting))
      await msg.channel.send(lang.rebooting)
      require('fs').unlinkSync('../blacklistener.pid')
      process.kill(process.pid, 'SIGKILL')
    })()
  } else {
    logger.info(f(lang.success, msg.content))
    msg.channel.send(lang.bye)
    client.destroy()
    cs.store()
    require('fs').unlinkSync('../blacklistener.pid')
  }
}
