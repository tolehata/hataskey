'use strict';

// Standalone mock. No fetch, storage, application imports, or remote images.
const LIMITS = Object.freeze({ bytes: 20 * 1024 * 1024, pixels: 40_000_000, side: 32768, preview: 1200 });
const SIDES = ['left', 'right', 'top', 'bottom'];
const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : min));

function extractEdges(data, width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || data.length !== width * height * 4) throw new Error('Invalid pixel buffer');
  const edgeX = Math.max(1, Math.round(width * .08));
  const edgeY = Math.max(1, Math.round(height * .08));
  const groups = Object.fromEntries([...SIDES, 'all'].map(side => [side, { total: 0, bins: Array.from({ length: 12 }, () => ({ count: 0, weight: 0, rgb: [0, 0, 0] })) }]));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sides = [];
    if (x < edgeX) sides.push('left');
    if (x >= width - edgeX) sides.push('right');
    if (y < edgeY) sides.push('top');
    if (y >= height - edgeY) sides.push('bottom');
    if (!sides.length) continue; // Never use central pixels.
    sides.push('all');
    for (const side of sides) groups[side].total++;
    const offset = (y * width + x) * 4;
    const rgb = [data[offset], data[offset + 1], data[offset + 2]];
    if (data[offset + 3] < 224) continue; // Ignore transparent / translucent RGB entirely.
    const hi = Math.max(...rgb), lo = Math.min(...rgb), delta = hi - lo;
    const saturation = hi ? delta / hi : 0;
    const brightness = (rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722) / 255;
    if (saturation < .18 || brightness < .12 || brightness > .9) continue;
    let hue = hi === rgb[0] ? (rgb[1] - rgb[2]) / delta : hi === rgb[1] ? (rgb[2] - rgb[0]) / delta + 2 : (rgb[0] - rgb[1]) / delta + 4;
    hue = ((hue * 60) % 360 + 360) % 360;
    const index = Math.min(11, Math.floor(hue / 30));
    const weight = .5 + saturation * .5;
    for (const side of sides) {
      const bin = groups[side].bins[index];
      bin.count++; bin.weight += weight;
      for (let channel = 0; channel < 3; channel++) bin.rgb[channel] += rgb[channel] * weight;
    }
  }
  function dominant(group) {
    const bin = group.bins.reduce((best, candidate) => candidate.weight > best.weight ? candidate : best);
    if (bin.count < Math.max(2, group.total * .03)) return null;
    return bin.rgb.map(value => Math.round(clamp(value / bin.weight, 0, 255)));
  }
  const fallback = dominant(groups.all);
  return Object.fromEntries(SIDES.map(side => [side, dominant(groups[side]) || fallback]));
}

function canvasContext(canvas, read = false) {
  const context = canvas.getContext('2d', read ? { willReadFrequently: true } : undefined);
  if (!context) throw new Error('このブラウザでは画像処理を利用できません。');
  return context;
}

function analyzeImage(source) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvasContext(canvas, true);
  context.drawImage(source, 0, 0, 64, 64);
  return extractEdges(context.getImageData(0, 0, 64, 64).data, 64, 64);
}

function previewSize(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > LIMITS.side || height > LIMITS.side || width * height > LIMITS.pixels) {
    throw new Error('画像が大きすぎます。40MP・一辺32,768px以内の画像を選んでください。');
  }
  const ratio = Math.min(1, LIMITS.preview / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

function orientedPreviewSize(dimensions) {
  const rotated = [5, 6, 7, 8].includes(dimensions.orientation);
  return previewSize(rotated ? dimensions.height : dimensions.width, rotated ? dimensions.width : dimensions.height);
}

function exifOrientation(view, start, end) {
  // Bounded TIFF IFD0 read: orientation is a single SHORT, not a full EXIF parser.
  if (start + 8 > end) return 1;
  const byteOrder = view.getUint16(start);
  if (byteOrder !== 0x4949 && byteOrder !== 0x4d4d) return 1;
  const little = byteOrder === 0x4949;
  if (view.getUint16(start + 2, little) !== 42) return 1;
  const ifd = start + view.getUint32(start + 4, little);
  if (ifd < start + 8 || ifd + 2 > end) return 1;
  const count = view.getUint16(ifd, little);
  for (let index = 0; index < count; index++) {
    const entry = ifd + 2 + index * 12;
    if (entry + 12 > end) break;
    if (view.getUint16(entry, little) !== 0x112 || view.getUint16(entry + 2, little) !== 3 || view.getUint32(entry + 4, little) !== 1) continue;
    const value = view.getUint16(entry + 8, little);
    return value >= 1 && value <= 8 ? value : 1;
  }
  return 1;
}

// Read bounded raster headers BEFORE decoding. User SVG is deliberately unsupported.
function rasterSize(buffer) {
  const bytes = new Uint8Array(buffer), view = new DataView(buffer);
  const ascii = (offset, text) => offset + text.length <= bytes.length && [...text].every((char, i) => bytes[offset + i] === char.charCodeAt(0));
  if (bytes.length >= 24 && bytes[0] === 137 && ascii(1, 'PNG\r\n\x1a\n') && ascii(12, 'IHDR')) return { width: view.getUint32(16), height: view.getUint32(20) };
  if (bytes.length >= 12 && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2, orientation = 1, dimensions = null;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if (marker === 225 && length >= 16 && ascii(offset + 2, 'Exif\x00\x00')) orientation = exifOrientation(view, offset + 8, offset + length);
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker) && length >= 8) dimensions = { width: view.getUint16(offset + 5), height: view.getUint16(offset + 3) };
      offset += length;
    }
    if (dimensions) return { ...dimensions, orientation };
  }
  if (bytes.length >= 30 && ascii(0, 'RIFF') && ascii(8, 'WEBP')) {
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const length = view.getUint32(offset + 4, true), payload = offset + 8;
      const u24 = start => bytes[start] + bytes[start + 1] * 256 + bytes[start + 2] * 65536;
      if (ascii(offset, 'VP8X') && length >= 10 && payload + 10 <= bytes.length) return { width: u24(payload + 4) + 1, height: u24(payload + 7) + 1 };
      if (ascii(offset, 'VP8 ') && length >= 10 && payload + 10 <= bytes.length && ascii(payload + 3, '\x9d\x01\x2a')) return { width: view.getUint16(payload + 6, true) & 16383, height: view.getUint16(payload + 8, true) & 16383 };
      if (ascii(offset, 'VP8L') && length >= 5 && payload + 5 <= bytes.length && bytes[payload] === 47) {
        const bits = view.getUint32(payload + 1, true);
        return { width: (bits & 16383) + 1, height: ((bits >>> 14) & 16383) + 1 };
      }
      offset = payload + length + (length % 2);
    }
  }
  throw new Error('PNG・JPEG・WebPの画像を選んでください。画像の寸法を読み取れませんでした。');
}

function createSample(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = 960; canvas.height = 640;
  const ctx = canvasContext(canvas);
  function gradient(y1, y2, stops) {
    const fill = ctx.createLinearGradient(0, y1, 0, y2);
    stops.forEach(([position, color]) => fill.addColorStop(position, color));
    return fill;
  }
  function shape(fill, points) {
    ctx.fillStyle = fill; ctx.beginPath();
    points.forEach(([x,y], index) => index ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
    ctx.closePath(); ctx.fill();
  }
  if (kind === 'sea' || kind === 'sunset') {
    const sunset = kind === 'sunset';
    ctx.fillStyle = gradient(0, 640, sunset ? [[0,'#69577f'],[.4,'#e19a8c'],[.55,'#eeb17e'],[1,'#677798']] : [[0,'#8cc3d4'],[.43,'#c0d9d7'],[.5,'#599ba9'],[1,'#28767f']]);
    ctx.fillRect(0,0,960,640);
    const sun = ctx.createRadialGradient(660,230,0,660,230,180);
    sun.addColorStop(0,sunset ? 'rgba(255,218,163,.75)' : 'rgba(243,241,211,.6)'); sun.addColorStop(1,'rgba(255,220,170,0)');
    ctx.fillStyle = sun; ctx.fillRect(460,30,400,400);
    if (sunset) { ctx.fillStyle='#ffdeb0'; ctx.beginPath(); ctx.arc(660,236,32,0,Math.PI*2); ctx.fill(); }
    shape(sunset ? '#626379' : '#72999e',[[0,312],[120,272],[260,298],[390,249],[525,302],[670,286],[960,320],[960,349],[0,349]]);
    ctx.fillStyle=gradient(325,640,sunset ? [[0,'#bc8d91'],[.5,'#8a819d'],[1,'#555e7b']] : [[0,'#63a6b2'],[.55,'#338a99'],[1,'#236a78']]); ctx.fillRect(0,330,960,310);
    for (let i=0;i<95;i++) {
      const y=342+i*3, x=(i*137)%960;
      ctx.strokeStyle=sunset ? `rgba(250,188,159,${.08+(i%4)*.04})` : `rgba(199,231,223,${.09+(i%4)*.035})`;
      ctx.lineWidth=1+(i%3); ctx.beginPath(); ctx.moveTo(x,y); ctx.bezierCurveTo(x+30,y-3,x+60,y+2,x+90+(i%7)*16,y); ctx.stroke();
    }
    shape(sunset ? '#364152' : '#244c52',[[0,555],[90,514],[130,525],[215,488],[268,514],[336,510],[440,640],[0,640]]);
    if (!sunset) shape('#a9bca7',[[720,640],[792,565],[880,549],[960,580],[960,640]]);
  } else {
    ctx.fillStyle=gradient(0,640,[[0,'#a4c2a0'],[.35,'#758f79'],[1,'#344e46']]); ctx.fillRect(0,0,960,640);
    for (let i=0;i<26;i++) {
      const x=(i*139)%1000, base=430+(i%6)*27;
      shape(i%2 ? '#567c65' : '#6a8a6c',[[x-96,base],[x+4,25+(i%5)*29],[x+105,base]]);
    }
    ctx.fillStyle=gradient(370,640,[[0,'#c9d0b2'],[.3,'#8fb3a8'],[1,'#4e8b88']]); ctx.fillRect(0,425,960,215);
    for (let i=0;i<35;i++) {ctx.fillStyle='rgba(212,223,188,.14)';ctx.fillRect((i*193)%960,450+i*5,80+(i%4)*25,2);}
    shape('#3b6151',[[0,455],[100,405],[175,446],[270,429],[390,640],[0,640]]);
    shape('#527057',[[960,427],[847,408],[793,455],[703,502],[669,640],[960,640]]);
  }
  return canvas;
}

const $ = id => document.getElementById(id);
const status = $('status');
const samples = ['sea','sunset','forest'].map((kind, index) => ({ kind, label: ['海','夕景','森'][index], canvas: createSample(kind) }));
const notes = [];
let selection = 0;
let displayedURL = null;
let cancelDecode = null;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderNote(index) {
  const people = [['凪','nagi','海沿いを歩いてきた。\n波の音だけ、しばらく聴いていた。','2分','🌊','✨'],['灯','akari','帰り道の、今日の空。','8分','🌅','🧡'],['翠','midori','水面に映る緑がきれいだった。','15分','🌿','🍃']];
  const [name, handle, text, time, reaction1, reaction2] = people[index];
  const article = element('article','note'); article.setAttribute('aria-label',`${name}のノート`);
  const tint = element('div','tint'); tint.setAttribute('aria-hidden','true');
  const glows = SIDES.map(side => element('div',`glow glow-${side}`)); tint.append(...glows);
  const grid = element('div','note-grid');
  const avatar = element('div','avatar-col'); avatar.append(element('span','avatar',name),element('span','audience','◎'));
  const body = element('div','note-body'), header = element('header','note-header');
  header.append(element('strong','',name),element('span','handle',`@${handle}`),element('time','',time));
  const image = element('img','note-image'); image.alt = ['波が広がる青い海のイラスト','夕陽と紫色の海のイラスト','緑の森と湖のイラスト'][index]; image.width=960; image.height=640;
  const actions = element('div','note-actions'); actions.setAttribute('aria-label','操作アイコンの配置見本');
  for (const [path, label, count] of [['M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 18 0Z','返信','2'],['m7 7 4-4-4-4M11 3H5v9m12 5-4 4 4 4m-4-4h6v-9','リノート','1'],['M8 3h10M8 8h10M8 13h10M8 18h10','その他','']]) {
    const span=element('span'); span.setAttribute('aria-label',`${label} ${count}`);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true');
    const line=document.createElementNS('http://www.w3.org/2000/svg','path'); line.setAttribute('d',path); svg.append(line); span.append(svg,document.createTextNode(count)); actions.append(span);
  }
  body.append(header,element('p','note-text',text),image,actions);
  const reactions=element('div','reactions'); reactions.setAttribute('aria-label','リアクションの見本');
  [reaction1,reaction2].forEach((emoji,i) => {const chip=element('span','reaction',emoji);chip.append(element('small','',String(i ? 3 : 8)));reactions.append(chip);});
  grid.append(avatar,body,reactions); article.append(tint,grid); $('timeline').append(article);
  return { article, image, glows };
}

function applyPalette(note, palette) {
  SIDES.forEach((side,index) => {note.glows[index].style.backgroundColor = palette[side] ? `rgb(${palette[side].map(channel => clamp(Math.round(channel),0,255)).join(',')})` : 'transparent';});
  if (note !== notes[0]) return;
  $('swatches').replaceChildren(...SIDES.map(side => {
    const swatch=element('span','swatch'); const color=palette[side];
    if (color) swatch.style.backgroundColor=`rgb(${color.join(',')})`;
    const label=`${{left:'左',right:'右',top:'上',bottom:'下'}[side]}: ${color ? color.join(', ') : '色なし'}`;
    swatch.title=label; swatch.setAttribute('role','img'); swatch.setAttribute('aria-label',label);
    return swatch;
  }));
}

function beginSelection() {
  selection++;
  cancelDecode?.(); cancelDecode=null;
  return selection;
}

function releaseDisplayed() {
  if (displayedURL) URL.revokeObjectURL(displayedURL);
  displayedURL=null;
}

function showSample(index) {
  beginSelection();
  const sample=samples[index], palette=analyzeImage(sample.canvas);
  notes[0].image.src=sample.canvas.toDataURL('image/png'); notes[0].image.alt=`${sample.label}の風景イラスト`;
  releaseDisplayed(); applyPalette(notes[0],palette);
  document.querySelectorAll('.sample-button').forEach((button,i) => button.setAttribute('aria-pressed',String(i===index)));
  status.textContent=`${sample.label}の縁の色を反映しました。`;
  notes[0].article.removeAttribute('aria-busy');
}

async function decodeFile(file, dimensions, ticket) {
  const size=orientedPreviewSize(dimensions);
  if (typeof createImageBitmap === 'function') {
    // One dimension only: the decoder derives height from its oriented aspect ratio.
    const bitmap=await createImageBitmap(file,{resizeWidth:size.width,resizeQuality:'high',imageOrientation:'from-image'});
    if (ticket!==selection) {bitmap.close(); return null;}
    return bitmap;
  }
  // Older browsers decode the original; keep their peak allocation smaller.
  if (dimensions.width*dimensions.height>16_000_000) throw new Error('このブラウザでは16MP以内の画像を選んでください。');
  const sourceURL=URL.createObjectURL(file), image=new Image();
  try {
    await new Promise((resolve,reject) => {
      let settled=false;
      const finish=error => {if(settled)return;settled=true;image.onload=image.onerror=null;cancelDecode=null;error ? reject(error) : resolve();};
      cancelDecode=() => {image.removeAttribute('src');finish(new Error('cancelled'));};
      image.onload=() => finish(); image.onerror=() => finish(new Error('decode')); image.src=sourceURL;
    });
    if (ticket!==selection) return null;
    previewSize(image.naturalWidth,image.naturalHeight);
    return image;
  } finally {URL.revokeObjectURL(sourceURL);}
}

function canvasBlob(canvas) {
  return new Promise((resolve,reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('画像を変換できませんでした。')),'image/png'));
}

async function selectFile(file) {
  if (!file) return; // Cancelling the native picker preserves the current choice.
  const ticket=beginSelection();
  notes[0].article.setAttribute('aria-busy','true'); status.textContent='画像を処理しています…';
  let source=null;
  try {
    if (!file.size || file.size>LIMITS.bytes) throw new Error('空でない20MB以内の画像を選んでください。');
    const dimensions=rasterSize(await file.slice(0,512*1024).arrayBuffer());
    if (ticket!==selection) return;
    source=await decodeFile(file,dimensions,ticket);
    if (!source || ticket!==selection) return;
    // Bitmap dimensions include EXIF orientation. Preserve the decoded aspect ratio.
    const size=previewSize(source.naturalWidth || source.width,source.naturalHeight || source.height);
    const canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
    canvasContext(canvas).drawImage(source,0,0,size.width,size.height);
    const palette=analyzeImage(canvas), blob=await canvasBlob(canvas);
    if (ticket!==selection) return;
    const url=URL.createObjectURL(blob);
    notes[0].image.src=url;notes[0].image.alt='選択したローカル画像'; releaseDisplayed();displayedURL=url;
    applyPalette(notes[0],palette);
    document.querySelectorAll('.sample-button').forEach(button => button.setAttribute('aria-pressed','false'));
    status.textContent=SIDES.some(side=>palette[side]) ? '画像の縁の色を反映しました。' : '縁に適した色がないため、通常の背景を使います。';
  } catch(error) {
    if(ticket===selection) status.textContent=/decode|image|bitmap/i.test(error.message) ? '画像を読み込めませんでした。別のPNG・JPEG・WebPを選んでください。' : error.message;
  } finally {
    source?.close?.();
    if(ticket===selection) notes[0].article.removeAttribute('aria-busy');
  }
}

function updateStrength() {
  const strength=clamp($('strength').value,0,40);
  $('strength').value=String(strength);$('strength-value').textContent=`${strength}%`;
  document.body.style.setProperty('--tint-opacity',String($('tint-enabled').checked ? strength/100 : 0));
}

function setTheme(theme) {
  document.body.dataset.theme=theme==='light' ? 'light' : 'dark';
  document.querySelectorAll('[data-theme]').forEach(button => {if(button.tagName==='BUTTON')button.setAttribute('aria-pressed',String(button.dataset.theme===document.body.dataset.theme));});
}

try {
  for(let index=0;index<3;index++) notes.push(renderNote(index));
  samples.forEach((sample,index) => {
    const button=element('button','sample-button'); button.type='button';button.setAttribute('aria-pressed',String(index===0));
    const thumbnail=element('img');thumbnail.src=sample.canvas.toDataURL('image/png');thumbnail.alt='';
    button.append(thumbnail,document.createTextNode(sample.label));button.addEventListener('click',()=>showSample(index));$('sample-buttons').append(button);
    notes[index].image.src=thumbnail.src;applyPalette(notes[index],analyzeImage(sample.canvas));
  });
  $('choose-image').addEventListener('click',()=>{ $('local-file').value='';$('local-file').click(); });
  $('local-file').addEventListener('change',event=>{void selectFile(event.target.files?.[0]);});
  $('strength').addEventListener('input',updateStrength);$('tint-enabled').addEventListener('change',updateStrength);
  document.querySelectorAll('button[data-theme]').forEach(button=>button.addEventListener('click',()=>setTheme(button.dataset.theme)));
  setTheme(window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');updateStrength();
  window.addEventListener('pagehide',()=>{beginSelection();releaseDisplayed();});
} catch(error) {status.textContent=error.message;}
