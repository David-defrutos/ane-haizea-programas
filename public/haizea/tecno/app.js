import { cards, topics, shuffle, optionsFor } from './data.js';
const $ = id => document.getElementById(id);
let lang=1,mode='quiz',deck=[],index=0,answers=[],options=[],flipped=false;
let key=null,known=new Set(),mistakes=new Set(),best=0;
const t=(es,eu)=>lang===0?es:eu;
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function btn(text,action,cls){const n=el('button',text,cls);n.addEventListener('click',action);return n;}
function save(){if(!key)return;try{localStorage.setItem(key,JSON.stringify({known:[...known],mistakes:[...mistakes],best}));}catch{$('storage').textContent=t('No se puede guardar el progreso.','Ezin da aurrerapena gorde.');}}
function filtered(){const topic=$('topic').value||'all';return cards.filter(c=>topic==='all'||c.topic===topic);}
function labels(){
 document.documentElement.lang=lang===0?'es':'eu';
 $('language').textContent=t('Euskara','Castellano');$('back').textContent=t('← Programas','← Programak');
 $('title').textContent=t('Enciende tus ideas.','Piztu zure ideiak.');
 $('intro').textContent=t('La electricidad, paso a paso. Aprende, prueba y repasa.','Elektrizitatea, pausoz pauso. Ikasi, probatu eta errepasatu.');
 $('topicLabel').textContent=t('Tema','Gaia');$('lengthLabel').textContent=t('Longitud del quiz','Quiz luzera');$('length').options[1].textContent=t('Todas','Guztiak');
 const selected=$('topic').value||'all';$('topic').replaceChildren();
 for(const [id,name] of [['all',['Todos los temas','Gai guztiak']],...Object.entries(topics)]){const n=el('option',name[lang]);n.value=id;$('topic').append(n);}$('topic').value=selected;
 $('quizMode').setAttribute('aria-pressed',String(mode==='quiz'));$('flashMode').setAttribute('aria-pressed',String(mode==='flash'));
 $('notesTitle').textContent=t('Sobre los apuntes','Apunteei buruz');
 $('notes').textContent=t('Basado en las cinco páginas del cuaderno. Se han aclarado definiciones: la electricidad no es una fuente primaria de energía. Los ejercicios de Ohm son práctica añadida. Las cifras del cuaderno (26.000, 765.000, 33.000, 400, 25.000 y 220 V) son referencias de clase, no valores universales; no se preguntan como reglas generales. Las fotos originales no se publican.','Koadernoko bost orrialdeetan oinarritua. Definizioak argitu dira: elektrizitatea ez da lehen mailako energia-iturria. Ohmen ariketak praktika gehigarria dira. Koadernoko zenbakiak (26.000, 765.000, 33.000, 400, 25.000 eta 220 V) klaseko erreferentziak dira, ez balio unibertsalak; ez dira arau orokor gisa galdetzen. Jatorrizko argazkiak ez dira argitaratzen.');
 $('storage').textContent=key?t('Progreso por perfil en este navegador; no se sincroniza entre dispositivos.','Profil bakoitzaren aurrerapena nabigatzaile honetan; ez da gailuen artean sinkronizatzen.'):t('Puedes estudiar; el progreso no se guarda sin un perfil válido.','Ikas dezakezu; aurrerapena ez da gordetzen baliozko profilik gabe.');
 $('saved').textContent=t(`${known.size}/${cards.length} tarjetas aprendidas · ${mistakes.size} para repasar · Mejor quiz: ${best}%`,`${known.size}/${cards.length} txartel ikasita · ${mistakes.size} berrikusteko · Quiz onena: %${best}`);
}
function start(custom){deck=shuffle(custom||filtered());if(mode==='quiz'&&$('length').value!=='all')deck=deck.slice(0,Number($('length').value));index=0;answers=[];flipped=false;options=[];render();}
function render(){
 labels();const area=$('activity');area.replaceChildren();
 if(!deck.length){area.append(el('h2',t('¡No quedan tarjetas en este repaso!','Ez dago txartelik errepaso honetan!')),btn(t('Volver a practicar','Berriro praktikatu'),()=>start(),'primary'));return;}
 if(index>=deck.length){results(area);return;}
 const card=deck[index],meta=el('div',undefined,'meta');meta.append(el('span',topics[card.topic][lang]),el('span',`${index+1} / ${deck.length}`));
 const progress=el('progress');progress.max=deck.length;progress.value=index;progress.setAttribute('aria-label',t('Progreso','Aurrerapena'));
 const question=el('h2',card.q[lang]);question.tabIndex=-1;area.append(meta,progress,question);
 if(mode==='flash'){
  if(flipped){area.append(el('div',card.a[lang],'answer'));const actions=el('div',undefined,'actions');actions.append(btn(t('Repasar otra vez','Berriro errepasatu'),()=>mark(false)),btn(t('¡Lo sé!','Badakit!'),()=>mark(true),'primary'));area.append(actions);}
  else area.append(btn(t('Mostrar respuesta','Erantzuna erakutsi'),()=>{flipped=true;render();},'primary'));
  const actions=el('div',undefined,'actions');const previous=btn(t('← Anterior','← Aurrekoa'),()=>{index--;flipped=false;render();});previous.disabled=index===0;
  actions.append(previous,btn(t('Siguiente →','Hurrengoa →'),()=>{index++;flipped=false;render();}),btn(t('Solo pendientes','Berrikustekoak soilik'),()=>start(filtered().filter(c=>!known.has(c.id)))));area.append(actions);
 }else{
  if(!options.length)options=optionsFor(card);const list=el('div',undefined,'options'),response=answers[index];
  for(const choice of options){const n=btn(choice.a[lang],()=>answer(choice.id));if(response){n.disabled=true;if(choice.id===card.id)n.className='correct';else if(choice.id===response.choice)n.className='wrong';}list.append(n);}area.append(list);
  if(response){const feedback=el('div',undefined,'feedback');feedback.setAttribute('role','status');feedback.append(el('strong',response.correct?t('¡Correcto!','Zuzen!'):t('Vamos a repasarlo.','Errepasatuko dugu.')),el('p',card.a[lang]));area.append(feedback,btn(index===deck.length-1?t('Ver resultado','Emaitza ikusi'):t('Siguiente →','Hurrengoa →'),()=>{index++;options=[];render();$('activity').querySelector('h2')?.focus();},'primary'));}
 }
}
function mark(value){const id=deck[index].id;if(value){known.add(id);mistakes.delete(id);}else{known.delete(id);mistakes.add(id);}save();index++;flipped=false;render();}
function answer(choice){if(answers[index])return;const card=deck[index],correct=choice===card.id;answers[index]={choice,correct};if(correct)mistakes.delete(card.id);else{mistakes.add(card.id);known.delete(card.id);}save();render();}
function results(area){
 area.append(el('h2',t('¡Ronda terminada!','Txanda amaitu da!')));
 if(mode==='quiz'){
  const correct=answers.filter(a=>a.correct).length,percent=Math.round(correct/deck.length*100);best=Math.max(best,percent);save();labels();
  area.append(el('p',`${correct} / ${deck.length}`,'score'),el('p',t(`${percent}% de aciertos. Cada error es una pista para aprender.`,`%${percent} zuzen. Akats bakoitza ikasteko pista bat da.`)));
  const failed=deck.filter((c,i)=>!answers[i].correct);
  if(failed.length){area.append(btn(t(`Repasar ${failed.length} fallos`,`Errepasatu ${failed.length} akats`),()=>start(failed),'primary'));const list=el('ul',undefined,'result-list');for(const c of failed){const n=el('li');n.append(el('strong',c.q[lang]),el('div',c.a[lang]));list.append(n);}area.append(list);}
 }else area.append(el('p',t('Vuelve a las pendientes para fijar lo aprendido.','Itzuli berrikusteko txarteletara ikasitakoa sendotzeko.')),btn(t('Repasar pendientes','Berrikustekoak errepasatu'),()=>start(filtered().filter(c=>!known.has(c.id))),'primary'));
 const actions=el('div',undefined,'actions');actions.append(btn(t('Nueva ronda','Txanda berria'),()=>start()));area.append(actions);
}
$('language').addEventListener('click',()=>{lang=1-lang;render();});$('topic').addEventListener('change',()=>start());$('length').addEventListener('change',()=>{if(mode==='quiz')start();});
$('quizMode').addEventListener('click',()=>{mode='quiz';start();});$('flashMode').addEventListener('click',()=>{mode='flash';start();});
start();
try{const response=await fetch('/api/me');if(response.ok&&!response.redirected){const profile=await response.json();if(typeof profile.user==='string'&&['member','guest'].includes(profile.role)){key=`tecno-v1:${profile.user}`;try{const data=JSON.parse(localStorage.getItem(key)||'{}'),valid=new Set(cards.map(c=>c.id));known=new Set(Array.isArray(data.known)?data.known.filter(id=>valid.has(id)):[]);mistakes=new Set(Array.isArray(data.mistakes)?data.mistakes.filter(id=>valid.has(id)):[]);best=Number.isFinite(data.best)?Math.max(0,Math.min(100,data.best)):0;}catch{}}}}catch{}
render();
