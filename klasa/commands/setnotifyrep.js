const { Command } = require('klasa')

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      name: 'setnotifyrep',
      usage: '<rep:number{0,10}>',
      aliases: [
        'notifyrep',
      ],
      permissionLevel: 6,
    })
  }

  async run(msg, [rep]) {
    settings.notifyRep = rep
    await msg.sendLocale('_setconfig', ['notifyRep'])
  }
}