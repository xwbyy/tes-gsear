let toM = a => '@' + a.split('@')[0]

let handler = async (m, { conn, groupMetadata }) => {
  if (!m.isGroup) return m.reply('Perintah ini hanya bisa digunakan di grup!');
  
  try {
    const participants = groupMetadata.participants.map(v => v.id);
    
    if (participants.length < 2) {
      return m.reply('Minimal harus ada 2 anggota di grup untuk menggunakan fitur ini!');
    }
    
    let a = participants[Math.floor(Math.random() * participants.length)];
    let b;
    
    do {
      b = participants[Math.floor(Math.random() * participants.length)];
    } while (b === a);
    
    m.reply(`${toM(a)} ❤️ ${toM(b)}`, null, {
      mentions: [a, b]
    });
  } catch (error) {
    console.error('Error in jadian handler:', error);
    m.reply('Terjadi error saat menjalankan perintah jadian');
  }
}

handler.help = ['jadian']
handler.tags = ['fun']
handler.command = ['jadian']
handler.group = true

export default handler