const { Command } = require('klasa')

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      name: 'setlog',
      usage: '<Channel:channel>',
      aliases: [
        'log',
      ],
      permissionLevel: 6,
    })
  }

  run(msg, [channel]) {
    settings.log_channel = channel.id
    msg.sendLocale('_setconfig', ['log_channel'])
  }
}
