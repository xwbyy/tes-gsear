let handler = async (m, { command, text }) => {
  const question = text.trim();
  if (!question) return m.reply('Contoh: .apakah saya ganteng?');
  
  const answers = ['Ya', 'Mungkin iya', 'Mungkin', 'Mungkin tidak', 'Tidak', 'Tidak mungkin'];
  const randomAnswer = answers[Math.floor(Math.random() * answers.length)];
  
  m.reply(`
*Pertanyaan:* ${command} ${question}
*Jawaban:* ${randomAnswer}
  `.trim(), null, m.mentionedJid ? {
    mentions: m.mentionedJid
  } : {});
}

handler.help = ['apakah <pertanyaan>']
handler.tags = ['kerang', 'fun']
handler.command = /^apakah$/i

export default handler