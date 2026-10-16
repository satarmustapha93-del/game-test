import * as THREE from 'three';

const START_NG = 'https://start.ng';
const isStartNgGame = location.hostname.endsWith('.start.ng');
const userLabel = document.querySelector('#username');
const signIn = document.querySelector('#sign-in');
const gameName = location.hostname.split('.')[0];
let currentPlayer = null;
let isSignedIn = false;
let framePromise;
let lookKey = 'little-worlds:preview';
let leaderboardRows = [];

// Only accept identity replies from the Start.ng frame itself and its exact origin.
function connectFrame() {
  if (!framePromise) framePromise = new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.src = `${START_NG}/connect`;
    frame.hidden = true;
    frame.onload = () => resolve(frame);
    frame.onerror = reject;
    document.body.append(frame);
  });
  return framePromise;
}
async function askStartNg(message, replyType, timeoutMs = 5000) {
  if (!isStartNgGame) return null;
  let frame;
  try { frame = await Promise.race([connectFrame(), new Promise((_, reject) => setTimeout(() => reject(Error('connect timeout')), timeoutMs))]); }
  catch { return null; }
  return new Promise(resolve => {
    const requestId = Math.random().toString(36).slice(2);
    const timer = setTimeout(() => done(null), timeoutMs);
    function done(reply) { clearTimeout(timer); removeEventListener('message', onMessage); resolve(reply); }
    function onMessage(event) {
      if (event.origin !== START_NG || event.source !== frame.contentWindow) return;
      if (event.data?.type === replyType && event.data.requestId === requestId) done(event.data);
    }
    addEventListener('message', onMessage);
    frame.contentWindow.postMessage({ ...message, requestId }, START_NG);
  });
}
function signInUrl() {
  return `${START_NG}/?return_to=${encodeURIComponent(location.origin + location.pathname)}`;
}
const validHair = ['short','afro','braids','bun','ponytail','dreads','bald'];
const validHats = ['none','cap','beanie','tophat','crown'];
const validAccessories = ['none','glasses','earrings','beard','scarf','backpack'];
const fallback = { body:'female', primaryColor:'#c8f36a', secondaryColor:'#59616b', skinColor:'#c98563', hairColor:'#382b40', hair:'short', hat:'none', accessory:'none' };
function normalizeStyle(input = {}) {
  const colors = key => /^#[0-9a-f]{6}$/i.test(input[key] || '') ? input[key] : fallback[key];
  return {
    body: input.body === 'male' ? 'male' : 'female',
    top: colors('primaryColor'), pants: colors('secondaryColor'), skin: colors('skinColor'), hairColor: colors('hairColor'),
    hair: validHair.includes(input.hair) ? input.hair : 'short',
    hat: validHats.includes(input.hat) ? input.hat : 'none',
    accessory: validAccessories.includes(input.accessory) ? input.accessory : 'none'
  };
}
let look = normalizeStyle();
function setSaveKey(id, player = null) {
  lookKey = `little-worlds:${id || 'preview'}`;
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(lookKey) || '{}'); } catch {}
  look = { ...normalizeStyle(player?.style || {}), ...saved };
}

const palette = {
  skin:['#f4d4bd','#e8b894','#c98563','#9d5b45','#70412f'],
  top:['#c8f36a','#ff806c','#b9a8ff','#65d9cf','#f4cd67','#f0f1f7'],
  pants:['#59616b','#27344c','#8d6a9f','#46877f','#b77e52','#eceef4'],
  hairColor:['#382b40','#211f26','#8d5132','#d4a24c','#c97563']
};
function addSwatches(rootId, field) {
  const root = document.querySelector(rootId);
  for (const color of palette[field]) {
    const button = document.createElement('button');
    button.className = 'swatch'; button.style.background = color; button.title = color; button.setAttribute('aria-label', `${field} ${color}`);
    button.addEventListener('click', () => { look[field] = color; applyLook(); }); root.append(button);
  }
}
addSwatches('#skins','skin'); addSwatches('#tops','top'); addSwatches('#pants','pants'); addSwatches('#hairs','hairColor');
for (const [id,field,values] of [['#hair-style','hair',validHair],['#hat-style','hat',validHats],['#accessory-style','accessory',validAccessories]]) {
  const control = document.querySelector(id); control.replaceChildren(...values.map(value => { const option=document.createElement('option'); option.value=value; option.textContent=value[0].toUpperCase()+value.slice(1); return option; }));
  control.addEventListener('change', () => { look[field] = control.value; applyLook(); });
}

const world = document.querySelector('#world');
const scene = new THREE.Scene(); scene.background = new THREE.Color('#202438'); scene.fog = new THREE.Fog('#202438',14,34);
const camera = new THREE.PerspectiveCamera(42,1,.1,100); camera.position.set(0,8,13); camera.lookAt(0,.4,0);
const renderer = new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.shadowMap.enabled=true; renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15; world.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight('#e2e9ff','#76647a',2)); const sun=new THREE.DirectionalLight('#fff0ce',3); sun.position.set(-5,9,6); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024); scene.add(sun);
const material=(color,roughness=.75)=>new THREE.MeshStandardMaterial({color,roughness});
const island=new THREE.Group(); scene.add(island);
function islandLayer(top,bottom,height,y,color){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,height,9),material(color));mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;island.add(mesh);}
islandLayer(5.5,5.05,.8,-.42,'#7c9a74'); islandLayer(5.05,3.9,1.2,-1.35,'#4c5b62'); islandLayer(3.9,2.2,.9,-2.3,'#aeb4a2'); islandLayer(2.2,.9,.7,-3.1,'#68716f');
for(const [x,z] of [[-3.7,-2.9],[-3.2,2.8],[3.6,2.9],[4,-2.2]]){const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.08,.13,.8,6),material('#715240'));trunk.position.set(x,.35,z);trunk.castShadow=true;island.add(trunk);const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.52,1),material('#98b777'));crown.position.set(x,.9,z);crown.scale.y=1.2;crown.castShadow=true;island.add(crown);}
for(let i=0;i<12;i++){const a=i*2.4,r=3.4+(i%3)*.3,rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.18+(i%3)*.06),material(i%2?'#9d9b88':'#b4ad94'));rock.position.set(Math.cos(a)*r,.03,Math.sin(a)*r);rock.scale.y=.6;island.add(rock);}

const hero=new THREE.Group(); scene.add(hero);
const mats={skin:material(look.skin,.65),top:material(look.top,.6),pants:material(look.pants,.7),hair:material(look.hairColor,.85),shoes:material('#292b3a'),accent:material('#f4d36f',.35)};
function capsule(parent,r,l,mat,x,y,z){const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(r,l,4,8),mat);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;}
const torso=capsule(hero,.31,.47,mats.top,0,1.03,0);const neck=new THREE.Mesh(new THREE.CylinderGeometry(.1,.12,.18,10),mats.skin);neck.position.y=1.42;hero.add(neck);
const head=new THREE.Mesh(new THREE.SphereGeometry(.29,18,14),mats.skin);head.position.y=1.72;head.scale.set(.88,1.08,.87);head.castShadow=true;hero.add(head);
const eyes=material('#242232',.4);for(const x of [-.08,.08]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.023,8,6),eyes);eye.position.set(x,1.73,.245);hero.add(eye);}const smile=new THREE.Mesh(new THREE.TorusGeometry(.05,.008,5,12,Math.PI),material('#7f423f'));smile.position.set(0,1.65,.255);smile.rotation.z=Math.PI;hero.add(smile);
const hairGroup=new THREE.Group(),hatGroup=new THREE.Group(),accessoryGroup=new THREE.Group();hero.add(hairGroup,hatGroup,accessoryGroup);
const arms=[],legs=[];for(const side of [-1,1]){const arm=capsule(hero,.1,.34,mats.top,side*.42,1.08,0);arms.push(arm);const hand=new THREE.Mesh(new THREE.SphereGeometry(.1,9,8),mats.skin);hand.position.set(side*.44,.82,0);hero.add(hand);legs.push(capsule(hero,.12,.34,mats.pants,side*.16,.46,0));const shoe=new THREE.Mesh(new THREE.SphereGeometry(.14,9,8),mats.shoes);shoe.scale.set(1,.65,1.4);shoe.position.set(side*.16,.14,.08);hero.add(shoe);}
const stars=[];const starPositions=[[-3.8,-3.6],[-1.5,-3.7],[1.8,-3.5],[3.8,-2.9],[-4,0],[4.2,.3],[-2.1,3.7],[2.5,3.5]];for(const[x,z]of starPositions){const group=new THREE.Group();group.position.set(x,.4,z);const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.22),material('#ffe47d',.3));gem.castShadow=true;group.add(gem);const ring=new THREE.Mesh(new THREE.TorusGeometry(.3,.018,6,18),material('#f5ce64'));ring.rotation.x=Math.PI/2;group.add(ring);island.add(group);stars.push(group);}
function addTube(group,from,to,r,mat){const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),d=new THREE.Vector3().subVectors(b,a);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),8),mat);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());mesh.castShadow=true;group.add(mesh);return mesh;}
function buildHair(){hairGroup.clear();const cap=new THREE.Mesh(new THREE.SphereGeometry(look.hair==='afro'?.36:.3,16,12,0,Math.PI*2,0,Math.PI*.56),mats.hair);cap.position.y=1.88;cap.scale.set(1,.92,.98);cap.castShadow=true;if(look.hair!=='bald')hairGroup.add(cap);
 if(look.hair==='afro'){const afro=new THREE.Mesh(new THREE.IcosahedronGeometry(.34,2),mats.hair);afro.position.y=1.97;afro.castShadow=true;hairGroup.add(afro);}
 if(look.hair==='bun'){const bun=new THREE.Mesh(new THREE.SphereGeometry(.14,12,9),mats.hair);bun.position.set(0,2.14,-.12);hairGroup.add(bun);}
 if(look.hair==='braids'||look.hair==='dreads'){for(const side of [-1,1]){for(let i=0;i<(look.hair==='dreads'?2:1);i++){const strand=capsule(hairGroup,.055,.34,mats.hair,side*(.2+i*.08),1.59-i*.05,.02);strand.rotation.z=side*-.06;}}}
 if(look.hair==='ponytail'){const tie=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),mats.hair);tie.position.set(0,1.83,-.25);hairGroup.add(tie);const tail=capsule(hairGroup,.075,.42,mats.hair,0,1.52,-.34);tail.rotation.x=-.3;}
}
function buildHat(){hatGroup.clear();const h=look.hat;if(h==='none'||look.hair==='bald'&&h==='none')return;
 if(h==='cap'){const crown=new THREE.Mesh(new THREE.SphereGeometry(.3,16,10,0,Math.PI*2,0,Math.PI*.48),mats.accent);crown.position.y=1.93;hatGroup.add(crown);const brim=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.035,16),mats.accent);brim.position.set(0,1.91,.08);hatGroup.add(brim);}
 if(h==='beanie'){const cap=new THREE.Mesh(new THREE.SphereGeometry(.31,16,10,0,Math.PI*2,0,Math.PI*.56),mats.accent);cap.position.y=1.93;hatGroup.add(cap);const brim=new THREE.Mesh(new THREE.CylinderGeometry(.29,.29,.09,16),mats.accent);brim.position.y=1.88;hatGroup.add(brim);}
 if(h==='tophat'){const crown=new THREE.Mesh(new THREE.CylinderGeometry(.16,.18,.3,12),mats.accent);crown.position.y=2.09;hatGroup.add(crown);const brim=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.05,16),mats.accent);brim.position.y=1.92;hatGroup.add(brim);}
 if(h==='crown'){for(let i=0;i<5;i++){const spike=new THREE.Mesh(new THREE.ConeGeometry(.055,.18,4),mats.accent);const a=i*Math.PI*2/5;spike.position.set(Math.cos(a)*.2,2.04,Math.sin(a)*.2);hatGroup.add(spike);}const band=new THREE.Mesh(new THREE.TorusGeometry(.23,.045,6,16),mats.accent);band.position.y=1.94;band.rotation.x=Math.PI/2;hatGroup.add(band);}
}
function buildAccessory(){accessoryGroup.clear();const a=look.accessory;
 if(a==='glasses'){for(const x of [-.09,.09]){const lens=new THREE.Mesh(new THREE.TorusGeometry(.055,.012,6,14),mats.accent);lens.position.set(x,1.74,.25);accessoryGroup.add(lens);}addTube(accessoryGroup,[-.035,1.74,.26],[.035,1.74,.26],.009,mats.accent);}
 if(a==='earrings'){for(const x of [-.245,.245]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.035,.009,5,12),mats.accent);ring.position.set(x,1.62,.04);accessoryGroup.add(ring);}}
 if(a==='beard'){const beard=new THREE.Mesh(new THREE.SphereGeometry(.19,12,9,0,Math.PI*2,.38,Math.PI*.56),mats.hair);beard.position.set(0,1.57,.07);accessoryGroup.add(beard);}
 if(a==='scarf'){const scarf=new THREE.Mesh(new THREE.TorusGeometry(.16,.055,6,16),mats.accent);scarf.position.y=1.4;scarf.rotation.x=Math.PI/2;accessoryGroup.add(scarf);}
 if(a==='backpack'){const pack=new THREE.Mesh(new THREE.BoxGeometry(.37,.4,.17),mats.accent);pack.position.set(0,1.05,-.25);pack.castShadow=true;accessoryGroup.add(pack);}
}
function applyLook(){torso.scale.set(look.body==='female'?1:1.12,1,.88);mats.skin.color.set(look.skin);mats.top.color.set(look.top);mats.pants.color.set(look.pants);mats.hair.color.set(look.hairColor);buildHair();buildHat();buildAccessory();document.documentElement.style.setProperty('--skin',look.skin);document.documentElement.style.setProperty('--outfit',look.top);document.documentElement.style.setProperty('--hair',look.hairColor);
 for(const [id,field] of [['skins','skin'],['tops','top'],['pants','pants'],['hairs','hairColor']])document.querySelectorAll(`#${id} .swatch`).forEach(b=>b.classList.toggle('sel',b.title===look[field]));
 document.querySelector('#hair-style').value=look.hair;document.querySelector('#hat-style').value=look.hat;document.querySelector('#accessory-style').value=look.accessory;
 try{localStorage.setItem(lookKey,JSON.stringify(look));document.querySelector('#saved').textContent='● saved'}catch{document.querySelector('#saved').textContent='● preview'}
}
function baseLookFromPlayer(player){return normalizeStyle(player?.style||{});}
function applyIdentity(reply){const user=reply?.user||null;const person=user||reply?.guest||null;currentPlayer=person;isSignedIn=!!user;
 if(!isStartNgGame){userLabel.textContent='Local preview';signIn.classList.add('hidden');}
 else if(user){userLabel.textContent=`${user.name||'Player'}${user.account?` · @${user.account}`:''}`;signIn.classList.add('hidden');}
 else if(person){userLabel.textContent='Guest character';signIn.href=signInUrl();signIn.classList.remove('hidden');}
 else{userLabel.textContent='Start.ng player unavailable';signIn.href=signInUrl();signIn.classList.remove('hidden');}
 const id=user?.id??'guest';setSaveKey(id,person);applyLook();
}
async function refreshPlayer(){if(!isStartNgGame)return;const reply=await askStartNg({type:'startng:whoami'},'startng:user');if(reply)applyIdentity(reply);}

async function loadLeaderboard(){const reply=await askStartNg({type:'startng:leaderboard',limit:5},'startng:leaderboardData');leaderboardRows=reply?.entries||[];renderLeaderboard();}
function renderLeaderboard(){const list=document.querySelector('#leaderboard-list');list.replaceChildren();if(!leaderboardRows.length){list.innerHTML='<li class="empty">Finish a run to start the board.</li>';return;}for(const row of leaderboardRows){const li=document.createElement('li');const mine=currentPlayer&&Number(row.player_id)===Number(currentPlayer.id);li.className=mine?'mine':'';const seconds=Number(row.stats?.time??row.score??0);const mm=Math.floor(seconds/60),ss=String(seconds%60).padStart(2,'0');li.innerHTML=`<span class="rank">${row.rank}</span><span class="board-name"></span><b>${mm}:${ss}</b>`;li.querySelector('.board-name').textContent=row.name||'Player';list.append(li);}}
async function submitTime(seconds){if(!isStartNgGame)return 'Preview run — publish the game to save times.';if(!isSignedIn)return 'Sign in with Start.ng to save a time.';const reply=await askStartNg({type:'startng:score',stats:{time:seconds}},'startng:scoreSaved');if(!reply?.ok)return reply?.error||'Could not save this run.';await loadLeaderboard();return reply.result?.improved?`New personal best! Leaderboard rank #${reply.result.rank}.`:`Time saved. Current rank #${reply.result?.rank||'—'}.`;}

let running=false,score=0,startedAt=0;const keys=new Set(),overlay=document.querySelector('#overlay');
function startGame(){hero.position.set(0,0,0);score=0;startedAt=performance.now();stars.forEach(star=>star.visible=true);document.querySelector('#score').textContent='0 / 8';overlay.classList.add('hidden');running=true;}
document.querySelector('#start').addEventListener('click',startGame);
function finishGame(){running=false;const seconds=Math.max(1,Math.floor((performance.now()-startedAt)/1000));const mm=Math.floor(seconds/60),ss=String(seconds%60).padStart(2,'0');overlay.innerHTML=`<div class="box"><div style="font-size:28px">🏆</div><h2>Island explorer!</h2><p id="result-copy">You found every star in ${mm}:${ss}. Saving your run…</p><button class="primary" id="again">Play again</button></div>`;overlay.classList.remove('hidden');document.querySelector('#again').onclick=startGame;submitTime(seconds).then(copy=>{const p=document.querySelector('#result-copy');if(p)p.textContent=`You found every star in ${mm}:${ss}. ${copy}`;});}
window.addEventListener('keydown',event=>{const key=event.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){keys.add(key);event.preventDefault();}});window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));document.querySelectorAll('.mobile button').forEach(button=>{const key=button.dataset.key;button.onpointerdown=event=>{event.preventDefault();keys.add(key);button.setPointerCapture(event.pointerId);};['pointerup','pointercancel','lostpointercapture'].forEach(name=>button.addEventListener(name,()=>keys.delete(key)));});
document.querySelector('#reset').onclick=()=>{look=baseLookFromPlayer(currentPlayer);applyLook();};
function resize(){const width=world.clientWidth,height=world.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(world);resize();
const clock=new THREE.Clock();function animate(){requestAnimationFrame(animate);const t=clock.elapsedTime,dt=Math.min(clock.getDelta(),.05);island.rotation.y=Math.sin(t*.16)*.03;stars.forEach((star,index)=>{star.position.y=.42+Math.sin(t*2+index)*.08;star.rotation.y=t*.7+index;});if(running){let x=0,z=0;if(keys.has('a')||keys.has('arrowleft'))x--;if(keys.has('d')||keys.has('arrowright'))x++;if(keys.has('w')||keys.has('arrowup'))z--;if(keys.has('s')||keys.has('arrowdown'))z++;const length=Math.hypot(x,z);if(length){x/=length;z/=length;hero.position.x=THREE.MathUtils.clamp(hero.position.x+x*3*dt,-4.65,4.65);hero.position.z=THREE.MathUtils.clamp(hero.position.z+z*3*dt,-4.65,4.65);hero.rotation.y=Math.atan2(x,z);const step=t*11;legs[0].rotation.x=Math.sin(step)*.5;legs[1].rotation.x=-Math.sin(step)*.5;arms[0].rotation.x=-Math.sin(step)*.35;arms[1].rotation.x=Math.sin(step)*.35;hero.position.y=Math.abs(Math.sin(step))*.04;}else{legs.forEach(leg=>leg.rotation.x*=.8);arms.forEach(arm=>arm.rotation.x*=.8);hero.position.y*=.75;}for(const star of stars)if(star.visible&&Math.hypot(hero.position.x-star.position.x,hero.position.z-star.position.z)<.58){star.visible=false;score++;document.querySelector('#score').textContent=`${score} / 8`;if(score===8)finishGame();}}renderer.render(scene,camera);}animate();

addEventListener('focus',refreshPlayer);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshPlayer();});
if(isStartNgGame){userLabel.textContent='Connecting to Start.ng…';signIn.href=signInUrl();signIn.classList.remove('hidden');refreshPlayer().then(loadLeaderboard);}else{userLabel.textContent='Local preview';document.querySelector('#leaderboard-list').innerHTML='<li class="empty">Shared scores appear after publishing.</li>';setSaveKey('preview');applyLook();}



