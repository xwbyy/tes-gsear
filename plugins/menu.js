let handler = async (m, { usedPrefix }) => {
  const menuText = `
╭─「 *MENU BOT* 」
│
├❏ *FUN & GAMES*
│├◦ .apakah <pertanyaan>
│└◦ .jadian
│
├❏ *INFORMASI*
│├◦ .owner
│├◦ .speed
│└◦ .menu
│
╰❏ *Bot aktif sejak:* ${new Date(global.db.data.stats.startTime).toLocaleString()}
  
© ${global.owner.map(v => v.replace(/@.+/, '')).join(', ')}
`.trim();

  m.reply(menuText);
}

handler.help = ['menu', 'help', '?']
handler.tags = ['main']
handler.command = /^(menu|help|\?)$/i

export default handler