// Everything about you that the card shows. Edit this file, nothing else.
// Lines marked TODO are guesses — change them or delete the row entirely.

export default {
  username: 'mtalhasahin',
  // Used for the "Uptime" counter. Your GitHub account was created 2014-05-07;
  // swap in your birthday if you'd rather count that.
  since: '2014-05-07',

  // Left column, above the separator.
  system: [
    ['OS', 'Windows 11, Android'],
    ['Host', 'Zirve Yazılım'],
    ['Kernel', 'Backend Engineer'],
    ['Shell', 'bash, PowerShell'],
    ['IDE', 'Visual Studio, VS Code'],
  ],

  languages: [
    ['Languages.Programming', 'TypeScript, JavaScript, C#'],
    ['Languages.Computer', 'HTML, CSS, SQL, JSON, YAML'],
    ['Languages.Real', 'Turkish, English'],
  ],

  hobbies: [
    ['Focus', 'APIs, data modelling, integrations'],
    ['Hobbies.Other', 'Gym, film'], // TODO
  ],

  contact: [
    ['Email', 'mtalhasahin56@gmail.com'],
    ['LinkedIn', 'mtalhasahin'], // TODO — confirm the handle
    ['GitHub', 'mtalhasahin'],
    ['Location', 'Ankara, Türkiye'],
  ],

  // How `npm run art` turns a photo into the two portraits. See SETUP.md for
  // what each knob does. The photo stays on your machine; only the .txt files
  // it produces are committed.
  portrait: {
    photo: 'photo.jpg',
    cols: 42,
    crop: '0.312,0.332,0.442,0.462', // x0,y0,x1,y1 as fractions — crop close to the face
    dark: { floor: 0.15, vignette: 0.86, gamma: 0.8 },
    light: { floor: 0.40, vignette: 0.72, gamma: 0.8, invert: true },
  },
};
