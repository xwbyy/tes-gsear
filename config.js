global.owner = [
  "6282389924037", // ganti nomor owner
  "6283896757956"  // nomor owner kedua kalo ada
];

// Hot reload untuk development
if (process.env.NODE_ENV === 'development') {
  const file = new URL(import.meta.url).pathname;
  const fs = await import('fs');
  
  fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(`[Hot Reload] Update ${file}`);
    import(`${file}?update=${Date.now()}`);
  });
}

/*
SCRIPT BY © VYNAA VALERIE 
•• recode kasih credits 
•• contacts: (t.me/VynaaValerie)
•• instagram: @vynaa_valerie 
•• (github.com/VynaaValerie) 
*/