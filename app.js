import {stages, frontier, titleIndex, completeLearning} from './journey.js';
import {studyPage, studyAction, finishDiagnostic, studyField} from './research.js';

const app = document.querySelector('#app');
const nav = document.querySelector('#nav');
const dialog = document.querySelector('#dialog');
const storageKey = 'udarnik-web-v1';
const defaults = () => ({xp:0, passed:0, outfit:0, reveal:null, attempts:[], sessions:[], favorites:[],
  theme:'system', effects:true, length:10, goal:10, research:{}, quiz:null});
let state = defaults();
try {
  const stored = JSON.parse(localStorage.getItem(storageKey));
  if (stored && typeof stored === 'object') state = {...state, ...stored};
} catch {}
let storageFailed = false;
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); }
  catch { storageFailed = true; }
}
const asset = (name) => './assets/' + name;
const sprite = (index) => asset('journey_bear_' + index + '.webp');
const vowels = 'аеёиоуыэюя';
const categories = ['Существительные','Глаголы','Прилагательные','Другие формы'];
const escape = (value) => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const button = (label, action, value = '', style = 'primary') =>
  '<button type="button" class="' + style + '" data-action="' + action + '" data-value="' + escape(value) + '">' + escape(label) + '</button>';
const card = (content, style = '') => '<section class="card ' + style + '">' + content + '</section>';
const heading = (title, sub = '') => '<h1>' + escape(title) + '</h1>' + (sub ? '<p class="muted">' + escape(sub) + '</p>' : '');
const meter = (value, max, label) => '<progress value="' + value + '" max="' + max + '" aria-label="' + escape(label) + '"></progress>';
const metric = (value, label) => card('<div class="big">' + escape(value) + '</div>' + escape(label));
const current = () => frontier(state.xp, state.passed);
const role = () => titleIndex(state.xp, state.passed);
const today = () => dayKey(new Date());
function dayKey(date) {
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
function shuffled(items) {
  const result = [...items];
  for (let i=result.length-1;i>0;i--) {
    const j = Math.floor(Math.random()*(i+1));
    [result[i],result[j]] = [result[j],result[i]];
  }
  return result;
}

const tabs = [
  ['home','Главная','M3 10l9-7 9 7v10H3z M9 20v-7h6v7'],
  ['map','Карта','m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15'],
  ['learn','Обучение','m2 9 10-5 10 5-10 5z M5 11v6l7 3 7-3v-6'],
  ['dictionary','Словарь','M5 3h15v15H6a2 2 0 0 0 0 4h14 M5 3v17 M10 7h6'],
  ['progress','Прогресс','M4 20v-6h3v6z M10 20V9h3v11z M16 20V4h3v16z'],
];
const pages = new Set([...tabs.map(([key])=>key),'wardrobe','settings','study']);
let words = [], diagnostic = {}, byId = new Map(), result = null, wardrobeIndex = state.outfit;
let query = '', onlyFavorites = false, overview = false, diagnosticTimer;
let page = readPage();
function readPage() {
  const hash = location.hash.slice(1);
  return pages.has(hash) ? hash : 'home';
}
function navigate(target) {
  if (!pages.has(target)) return;
  if (page === target) { render(); return; }
  page = target;
  location.hash = target;
  window.scrollTo(0,0);
  render();
}
function closeDialog() { if (dialog.open) dialog.close(); }
function showDialog(html) {
  document.querySelector('#dialog-content').innerHTML = html;
  if (!dialog.open) dialog.showModal();
}
function render() {
  if (state.theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = state.theme;
  document.documentElement.dataset.effects = state.effects ? 'on' : 'off';
  const quiz = state.quiz;
  document.querySelector('#xp').hidden = Boolean(quiz?.diagnostic || result?.diagnostic);
  document.querySelector('#xp').textContent = state.xp + ' XP';
  nav.hidden = Boolean(quiz || result || state.reveal);
  const activeTab = page === 'wardrobe' ? 'map' : ['study','settings'].includes(page) ? 'progress' : page;
  nav.innerHTML = tabs.map(([id,label,path]) => '<a href="#' + id + '"' +
    (id===activeTab?' aria-current="page"':'') + '><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + path + '"/></svg>' + label + '</a>').join('');
  app.className = !quiz && !result && !state.reveal && page==='map' ? 'map-page' : '';
  let content;
  if (quiz) content = quizPage(quiz);
  else if (state.reveal) content = revealPage();
  else if (result) content = resultPage();
  else content = ({home:homePage,map:mapPage,learn:learnPage,dictionary:dictionaryPage,progress:progressPage,
    wardrobe:wardrobePage,settings:settingsPage,study:()=>studyPage(context)})[page]();
  app.innerHTML = (storageFailed ? '<p class="notice" role="status">Браузер не смог сохранить данные. Прогресс доступен в этой вкладке.</p>' : '') + content;
  clearInterval(diagnosticTimer);
  if (quiz?.diagnostic) {
    diagnosticTimer = setInterval(tickDiagnostic, 250);
    tickDiagnostic();
  }
  if (app.classList.contains('map-page') && !overview) {
    const container = app.querySelector('.map-scroll');
    const art = app.querySelector('.map-art');
    container.scrollTop = art.clientHeight * points[current()][1] - container.clientHeight * .58;
  }
}
function homePage() {
  const day = words[Math.floor(Date.now()/86400000)%words.length];
  const learnedToday = state.attempts.filter(a=>a.date===today()).length;
  return heading('Ударник','Тренажёр правильной речи') +
    '<div class="actions">' + button('Путь ударника','go','map','full primary') + '</div>' +
    card('<div class="hero-grid"><div><h2>Привет!</h2><p>Прокачай свою речь</p><strong>' + stages[role()].title +
      '</strong></div><img src="' + sprite(state.outfit) + '" alt="Ударик"></div><div class="actions">' +
      button('Начать тренировку','learn-all','','secondary') + '</div>', 'hero') +
    (state.passed===current() ? '<div class="actions">'+button('Испытание: '+stages[current()].location,'challenge',current(),'secondary')+'</div>' : '') +
    card('<h2>Слово дня</h2><div class="word">' + escape(day.answer) + '</div><p>' + escape(day.category) + '</p>' + button('Открыть карточку','word',day.id,'secondary')) +
    card('<h2>Ежедневная цель</h2><p>' + learnedToday + ' из ' + state.goal + ' заданий</p>' + meter(Math.min(learnedToday,state.goal),state.goal,'Ежедневная цель'));
}
function lastAttempts() { return new Map(state.attempts.map(a=>[a.id,a])); }
function learnPage() {
  const last = lastAttempts();
  const errors = [...last.values()].filter(a=>!a.correct).length;
  return heading('Твой маршрут','Осваивай ударения шаг за шагом') +
    categories.map((category,i)=>{
      const group=words.filter(w=>w.category===category);
      return card('<h2>'+category+'</h2><p>'+group.length+' слов · '+group.filter(w=>last.get(w.id)?.correct).length+' освоено</p>'+
        button('Тренироваться','learn-category',i,'primary full'));
    }).join('') +
    card('<h2>Работа над ошибками</h2><p>Сложных слов: '+errors+'</p>'+
      (errors ? button('Повторить','learn-errors') : '')+
      '<div class="actions">'+button('Марафон · 20 заданий','marathon','','secondary')+'</div>');
}
function dictionaryPage() {
  return heading('Словарь','Проверяй и повторяй слова') +
    '<label class="field"><span>Поиск по словарю</span><input id="search" type="search" autocomplete="off" placeholder="Поиск слова" value="'+escape(query)+'"></label>'+
    '<div class="actions"><button type="button" class="secondary" data-action="only-favorites" aria-pressed="'+onlyFavorites+'">Избранное</button></div><div id="dictionary-list">'+entries()+'</div>';
}
function entries() {
  const key = query.trim().toLowerCase().replace(/ё/g,'е');
  const list = words.filter(w=>w.word.replace(/ё/g,'е').includes(key) && (!onlyFavorites || state.favorites.includes(w.id)));
  return '<p class="muted" role="status">'+(list.length ? list.length+' слов' : 'Слова не найдены')+'</p>'+
    list.map(w=>{
      const favorite = state.favorites.includes(w.id);
      return card('<div class="row"><button type="button" class="entry" data-action="word" data-value="'+w.id+'"><strong class="word">'+escape(w.answer)+'</strong><small>'+escape(w.category)+'</small></button>'+
        '<button type="button" class="favorite secondary" data-action="favorite" data-value="'+w.id+'" aria-label="Избранное: '+escape(w.word)+'" aria-pressed="'+favorite+'">'+(favorite?'♥':'♡')+'</button></div>','list-card');
    }).join('');
}
function showWord(word) {
  const syllables = [...word.word].map((letter,index)=>({letter,index})).filter(({letter})=>vowels.includes(letter));
  const stress = syllables.flatMap(({index},i)=>word.stress.includes(index)?[i+1+'-й']:[]);
  showDialog('<h2>'+escape(word.answer)+'</h2><p>Ударение на '+stress.join(', ')+' слог</p>'+button('Повторить','learn-word',word.id,'primary full'));
}
const points = [[.32,.822],[.52,.780],[.32,.623],[.54,.570],[.19,.403],[.565,.347],[.715,.228],[.529,.122]];
const bends = [[.68,.963],[.53,.924],[.27,.897],[.23,.855],points[0],points[1],[.595,.731],[.55,.694],[.47,.668],points[2],[.395,.591],points[3],[.606,.544],[.546,.511],[.39,.481],[.195,.45],points[4],[.35,.377],points[5],[.55,.327],[.484,.302],[.52,.28],[.714,.248],points[6],[.585,.208],[.566,.19],[.652,.165],[.671,.143],points[7]];
function roadPath(active) {
  const end=bends.indexOf(points[active]);const xy=([x,y])=>[x*1000,y*1500].join(' ');
  let path='M'+xy(bends[0]);
  for(let i=1;i<=end;i++) {
    const a=bends[i-1], b=bends[i], pre=bends[Math.max(0,i-2)], next=bends[Math.min(bends.length-1,i+1)];
    const c1=a.map((x,k)=>x+(b[k]-pre[k])/6);
    const c2=b.map((x,k)=>x-(next[k]-a[k])/6);
    path+=' C'+xy(c1)+' '+xy(c2)+' '+xy(b);
  }
  return path;
}
const position = ([x,y]) => 'left:'+x*100+'%;top:'+y*100+'%';
function mapPage() {
  const active=current(), next=stages[active+1];
  const reached = state.passed===stages.length;
  return heading('Путь ударника',stages[role()].title)+
    '<p><strong>'+stages[active].location+'</strong></p>'+
    (reached?'<p>Все испытания пройдены</p>':next ? '<p class="muted">Следующая локация · '+state.xp+' / '+next.xp+' XP</p>'+
      '<p>'+(state.passed>active?'Испытание зачтено ✓':'Испытание: '+stages[active].required+' верных из '+stages[active].questions)+'</p>':
      '<p>Впереди королевское испытание · 16 из 20</p>')+
    '<div class="actions">'+button('Гардероб','go','wardrobe','secondary')+
    button(overview?'К текущей точке':'Весь путь','overview','','secondary')+'</div>'+
    '<div class="map-scroll'+(overview?' overview':'')+'"><div class="map-art">'+
    '<svg class="road" viewBox="0 0 1000 1500" preserveAspectRatio="none" aria-hidden="true"><path d="'+roadPath(active)+'" fill="none" stroke="#ffd570" stroke-opacity=".65" stroke-width="9" stroke-linecap="round"/></svg>'+
    (overview?'':'<img class="map-bear" alt="Ударик" style="'+position(points[active])+'" src="'+sprite(state.outfit)+'">')+
    points.map((point,i)=>'<button class="marker '+(i===active?'current':'')+'" type="button" data-action="location" data-value="'+i+'" style="'+position(point)+'" aria-label="'+stages[i].location+(i<state.passed?', пройдено':i===active?', текущая точка':i>active?', закрыто':'')+'">'+(i<state.passed?'✓':i<=active?'★':'🔒')+'</button>').join('')+'</div></div>';
}
function showLocation(i) {
  const stage=stages[i], active=current();
  const target=i<=active?i:state.passed===active?active:null;
  const next=stages[i+1];
  showDialog('<img class="place-art" alt="" src="'+asset('journey_place_'+i+'.webp')+'"><h2>'+stage.location+'</h2><p>'+stage.title+'</p>'+
    (i<=active?'<p>'+stage.required+' верных ответов из '+stage.questions+'</p>':'')+
    (i<state.passed?'<p>Испытание пройдено ✓</p>':'')+
    (state.xp<stage.xp?'<p>Нужно '+stage.xp+' XP · у тебя '+state.xp+' XP</p>':'')+
    (i>state.passed?'<p>Пройди испытание «'+stages[state.passed].location+'».</p>':'')+
    (i<=active?'<p>'+(next?'Следующая роль — '+next.title+' · '+next.xp+' XP':'Награда — коронация и королевский костюм.')+'</p>':'')+
    (target===null?button('Тренировка на XP','learn-all','','primary full'):
    button(i<=active?'Начать испытание':'Пройти: '+stages[target].location,'challenge',target,'primary full')));
}
function wardrobePage() {
  const stage=stages[wardrobeIndex];
  return heading('Гардероб','Титул · '+stages[role()].title)+
    card('<img class="wardrobe-art" src="'+sprite(wardrobeIndex)+'" alt="'+stage.title+'"><h2>'+stage.title+'</h2><p>'+stage.location+'</p>'+
      (wardrobeIndex===state.outfit?'<strong>Выбранный образ</strong>':wardrobeIndex<=role()?button('Надеть','wear',wardrobeIndex):'<p>Откроется при '+stage.xp+' XP '+(wardrobeIndex===7?'после коронации.':'после предыдущего испытания.')+'</p>'))+
    '<div class="chips">'+stages.map((stage,i)=>'<button class="secondary" type="button" data-action="preview-outfit" data-value="'+i+'" aria-pressed="'+(i===wardrobeIndex)+'">'+(i>role()?'🔒 ':'')+stage.title+'</button>').join('')+'</div>';
}
function progressPage() {
  const a=state.attempts;
  const accuracy=list=>list.length?Math.round(list.filter(x=>x.correct).length/list.length*100):0;
  const counts=Array.from({length:7},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()+i-6);
    return {label:d.toLocaleDateString('ru',{day:'2-digit',month:'2-digit'}),count:a.filter(t=>t.date===dayKey(d)).length};
  });
  const days=new Set(a.map(t=>t.date)).size;
  return heading('Твои результаты','Каждая тренировка — шаг вперёд')+
    '<div class="actions">'+button('Профиль и настройки','go','settings','secondary')+'</div>'+
    '<div class="grid">'+metric(accuracy(a)+'%','Точность')+metric(a.length,'Ответов')+'</div>'+
    card('<h2>Активность за 7 дней</h2>'+counts.map(d=>'<div class="stats-line"><span>'+d.label+'</span>'+
      meter(d.count,Math.max(10,...counts.map(c=>c.count)),d.label)+'<span>'+d.count+'</span></div>').join(''))+
    card('<h2>По темам</h2>'+categories.map(c=>'<p>'+c+' · '+accuracy(a.filter(t=>t.category===c))+'%</p>').join(''))+
    card('<h2>Достижения</h2><div class="stack">'+[['Первый шаг',a.length>0],['50 ответов',a.length>=50],['100 XP',state.xp>=100],['7 дней занятий',days>=7]].map(([label,on])=>'<span>'+(on?'✓ ':'')+label+' · '+(on?'получено':'впереди')+'</span>').join('')+'</div>');
}
function setting(label, key, options) {
  return '<label class="field"><span>'+label+'</span><select data-setting="'+key+'">'+options.map(([value,name])=>
    '<option value="'+value+'"'+(value===state[key]?' selected':'')+'>'+name+'</option>').join('')+'</select></label>';
}
function settingsPage() {
  return heading('Профиль',stages[role()].title)+card('<h2>Настройки</h2>'+
    setting('Тема','theme',[['system','Как на устройстве'],['light','Светлая'],['dark','Тёмная']])+
    setting('Заданий в тренировке','length',[[5,5],[10,10],[15,15]])+
    setting('Ежедневная цель','goal',[[5,5],[10,10],[20,20]])+
    '<label><input type="checkbox" data-setting="effects" '+(state.effects?'checked':'')+'> Игровые эффекты</label>')+
    card('<h2>Установка на iPhone</h2><p>Safari → «Поделиться» → «На экран „Домой“». Включи «Открыть как веб-приложение» и нажми «Добавить».</p>')+
    card('<h2>Научное исследование</h2><p>Две анкеты и два диагностических теста.</p>'+button('Открыть исследование','go','study','secondary'))+
    card('<h2>Данные на устройстве</h2><p>Прогресс сохраняется в этом браузере.</p>'+button('Удалить данные','reset','','secondary'));
}

function newQuiz(list, challenge = null, diagnosticMode = null) {
  if (!list.length) return;
  closeDialog();
  result=null;
  state.quiz={ids:list.map(w=>w.id),challenge,diagnostic:diagnosticMode,index:0,selected:-1,answers:[],started:Date.now(),returnPage:page};
  save();window.scrollTo(0,0);render();
}
function currentWord(quiz) {
  return quiz.diagnostic ? diagnostic[quiz.diagnostic][quiz.index] : byId.get(quiz.ids[quiz.index]);
}
function quizPage(q) {
  const w=currentWord(q), last=q.index===q.ids.length-1;
  const prefix=q.diagnostic?'Диагностика':q.challenge!==null?stages[q.challenge].location:'Тренировка';
  const feedback=!q.diagnostic && q.selected>=0;
  const letters=[...w.word].map((ch,i)=>vowels.includes(ch)?
    '<button type="button" aria-label="Гласная '+ch+', позиция '+(i+1)+'" class="letter '+(i===q.selected?'selected ':'')+
      (feedback&&w.stress.includes(i)?'right':feedback&&i===q.selected?'wrong':'')+'" data-action="answer" data-value="'+i+'"'+(feedback?' disabled':'')+'>'+ch+'</button>':
      '<span>'+escape(ch)+'</span>').join('');
  return '<div class="quiz-top">'+button('Выйти','leave-quiz','','secondary')+'<strong>'+escape(prefix)+'</strong><span>'+(q.index+1)+'/'+q.ids.length+'</span></div>'+
    meter(q.index+1,q.ids.length,'Вопрос ' +(q.index+1))+
    (q.diagnostic?'<p id="timer" class="notice" aria-live="off"></p>':'')+
    '<div class="actions">'+heading('Поставь ударение','Выбери ударную гласную')+'</div>'+
    card((q.diagnostic&&w.example?'<p>Контекст: '+escape(w.example)+'</p>':'')+'<div class="letter-row">'+letters+'</div>')+
    (feedback?card('<strong>'+(w.stress.includes(q.selected)?'Верно · +10 XP':'Правильное ударение')+'</strong><div class="word">'+escape(w.answer)+'</div>'):'')+
    '<button class="primary full" type="button" data-action="next"'+(!q.diagnostic&&q.selected<0?' disabled':'')+'>'+
    (last ? q.challenge===null?'Завершить':'Зачесть испытание':q.diagnostic&&q.selected<0?'Пропустить':'Далее')+'</button>';
}
function queueRole(previous) {
  if (role()<=previous || state.reveal) return;
  state.outfit=role();
  state.reveal={index:role()};
}
function chooseAnswer(index) {
  const q=state.quiz;
  if (!q || (!q.diagnostic && q.selected>=0)) return;
  const w=currentWord(q);
  if (!vowels.includes(w.word[index] ?? ' ')) return;
  q.selected=index;
  if (!q.diagnostic) {
    const previous=role(), correct=w.stress.includes(index);
    state.attempts.push({id:w.id,correct,category:w.category,date:today(),time:Date.now()});
    if (correct) state.xp+=10;
    queueRole(previous);
  }
  save();render();
}
function advance() {
  const q=state.quiz;
  if (!q || (!q.diagnostic&&q.selected<0)) return;
  q.answers.push(q.selected);
  if (q.answers.length===q.ids.length) { finishQuiz(q.answers); return; }
  q.index++;q.selected=-1;
  save();window.scrollTo(0,0);render();
}
function finishQuiz(answers) {
  const q=state.quiz;
  if (!q) return;
  const bank=q.diagnostic ? diagnostic[q.diagnostic] : q.ids.map(id=>byId.get(id));
  const completed=Date.now();
  const records=bank.map((w,i)=>({id:w.id,category:w.category,selected:answers[i]??-1,correct:w.stress.includes(answers[i]??-1)}));
  const score=records.filter(a=>a.correct).length;
  const session={score,startedAt:q.started,finishedAt:completed,durationSeconds:Math.floor((completed-q.started)/1000),date:today(),answers:records};
  if (q.diagnostic) finishDiagnostic(state,q.diagnostic,session);
  else {
    const previous=role();
    state.passed=completeLearning(state.xp,state.passed,q.challenge,records.length,score);
    if (q.challenge!==null) session.challenge=q.challenge;
    state.sessions.push(session);
    queueRole(previous);
  }
  result=state.reveal ? null : {diagnostic:q.diagnostic,challenge:q.challenge,score,total:bank.length,returnPage:q.returnPage};
  state.quiz=null;
  save();window.scrollTo(0,0);render();
}
function tickDiagnostic() {
  const q=state.quiz;
  if (!q?.diagnostic) return;
  const seconds=Math.max(0,Math.ceil((q.started+420000-Date.now())/1000));
  if (!seconds) { finishQuiz([...q.answers,q.selected]);return; }
  const timer=app.querySelector('#timer');
  if (timer) timer.textContent='Осталось '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
}
function resultPage() {
  const r=result, active=current();
  if (r.diagnostic) return heading('Диагностика завершена','Ответы сохранены')+button('Вернуться к исследованию','end-result','','primary full');
  const stage=stages[active],next=stages[active+1];
  return heading(r.challenge===null?'Тренировка завершена':'Испытание завершено',r.challenge===null?'':stages[r.challenge].location)+
    '<div class="grid">'+metric(r.score+' / '+r.total,'Правильных ответов')+metric('+'+r.score*10+' XP','Начислено')+'</div>'+
    (r.challenge===null?'':'<p>'+(r.score>=stages[r.challenge].required?'Испытание пройдено':'Для зачёта нужно '+stages[r.challenge].required+' верных ответов.')+'</p>')+
    (state.passed===active?card('<p>Для продвижения пройди испытание «'+stage.location+'»: '+stage.required+' из '+stage.questions+'.</p>'+button('Начать испытание','challenge',active)):
      next?'<p>Испытание зачтено. До «'+next.location+'» осталось '+(next.xp-state.xp)+' XP.</p>':'')+
    button(r.challenge===null?'Продолжить':'Вернуться на карту','end-result','','primary full');
}
function revealPage() {
  const i=state.reveal.index, stage=stages[i];
  return card('<p>'+(i===7?'Коронация':'Новая роль')+'</p><h1>'+stage.title+'</h1><img class="reveal-art" src="'+sprite(i)+'" alt="'+stage.title+'"><p>'+stage.location+'</p>'+button('Продолжить путь','dismiss-reveal','','secondary full'),'reveal-card');
}
const context={get state(){return state;},button,card,heading,escape,save,render,showDialog,closeDialog,newQuiz,get diagnostic(){return diagnostic;}};
document.addEventListener('click',event=>{
  const target=event.target.closest('[data-action]');
  if (!target || target.disabled) return;
  const {action,value}=target.dataset, i=Number(value);
  switch(action) {
    case 'go': closeDialog();if(value==='wardrobe')wardrobeIndex=state.outfit;navigate(value);break;
    case 'learn-all': newQuiz(shuffled(words).slice(0,state.length));break;
    case 'learn-category': newQuiz(shuffled(words.filter(w=>w.category===categories[i])).slice(0,state.length));break;
    case 'marathon': newQuiz(shuffled(words).slice(0,20));break;
    case 'learn-errors': { const last=lastAttempts();newQuiz(shuffled(words.filter(w=>last.get(w.id)?.correct===false)).slice(0,state.length));break; }
    case 'learn-word': if(byId.has(value))newQuiz([byId.get(value)]);break;
    case 'challenge': if(stages[i]&&i<=current()){page='map';location.hash='map';newQuiz(shuffled(words).slice(0,stages[i].questions),i);}break;
    case 'word': if(byId.has(value))showWord(byId.get(value));break;
    case 'favorite':
      state.favorites=state.favorites.includes(value)?state.favorites.filter(x=>x!==value):[...state.favorites,value];
      save();
      if(onlyFavorites) document.querySelector('#dictionary-list').innerHTML=entries();
      else { const chosen=state.favorites.includes(value);target.setAttribute('aria-pressed',chosen);target.textContent=chosen?'♥':'♡'; }
      break;
    case 'only-favorites': onlyFavorites=!onlyFavorites;render();break;
    case 'overview': overview=!overview;render();break;
    case 'location': if(stages[i])showLocation(i);break;
    case 'preview-outfit': if(stages[i]){wardrobeIndex=i;render();}break;
    case 'wear': if(i<=role()){state.outfit=i;save();render();}break;
    case 'answer': chooseAnswer(i);break;
    case 'next': advance();break;
    case 'leave-quiz':
      showDialog('<h2>Выйти из задания?</h2><p>'+(state.quiz?.diagnostic?'Диагностика будет отменена.':'Учебные ответы сохранятся.')+'</p>'+
        button('Выйти','confirm-leave','','primary full'));break;
    case 'confirm-leave': {
      const returnPage=state.quiz?.returnPage ?? 'home';
      state.quiz=null;closeDialog();save();navigate(returnPage);break;
    }
    case 'end-result': { const targetPage=result?.returnPage??'home';result=null;navigate(targetPage);break; }
    case 'dismiss-reveal': state.reveal=null;overview=false;save();navigate('map');break;
    case 'reset': showDialog('<h2>Удалить локальный прогресс?</h2><p>Будут удалены ответы, избранное, костюмы и данные исследования в этом браузере.</p>'+button('Удалить','confirm-reset','','primary full'));break;
    case 'confirm-reset': state=defaults();save();closeDialog();navigate('home');break;
    default: studyAction(action,value,context);
  }
});
document.addEventListener('input',event=>{
  if(event.target.id==='search'){
    query=event.target.value;
    document.querySelector('#dictionary-list').innerHTML=entries();
  }
  studyField(event.target,context);
});
document.addEventListener('change',event=>{
  const field=event.target, key=field.dataset.setting;
  if(!key)return;
  state[key]=key==='effects'?field.checked:['length','goal'].includes(key)?Number(field.value):field.value;
  save();render();
});
window.addEventListener('hashchange',()=>{
  const target=readPage();
  if(target===page)return;
  page=target;closeDialog();window.scrollTo(0,0);render();
});
async function init() {
  try{
    const loaded=await Promise.all(['words','before','after'].map(async name=>{
      const response=await fetch(asset(name+'.json'));
      if(!response.ok)throw new Error(response.status);
      return response.json();
    }));
    [words,diagnostic.beforeTest,diagnostic.afterTest]=loaded;
    byId=new Map(words.map(w=>[w.id,w]));
    if(state.quiz && !state.quiz.diagnostic && state.quiz.ids.some(id=>!byId.has(id))) {state.quiz=null;save();}
    app.removeAttribute('aria-busy');render();
    if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  } catch {
    app.removeAttribute('aria-busy');
    app.innerHTML='<p role="alert">Словарь пока недоступен. Открой приложение с интернетом и обнови страницу.</p>';
  }
}
init();
