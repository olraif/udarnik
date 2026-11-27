const steps = [
  ['beforeSurvey','Первичная анкета'],
  ['beforeTest','Входной тест · 7 минут'],
  ['afterTest','Итоговый тест · 7 минут'],
  ['afterSurvey','Итоговая анкета'],
];
const common = [
  'Мне интересно изучать правильные ударения.',
  'Я готов регулярно повторять трудные слова.',
  'Я уверен, что могу правильно поставить ударение в знакомых словах.',
  'Мне удобно заниматься самостоятельно.',
];
const final = [
  'Объяснения после ответа помогали запоминать ударения.',
  'Повторение ошибок помогало закреплять знания.',
  'Баллы за правильные ответы мотивировали продолжать занятия.',
  'Уровни и достижения поддерживали интерес к тренировкам.',
  'Ежедневные цели помогали заниматься регулярно.',
  'Мне удобно отслеживать свой прогресс.',
];
const mechanics = ['Баллы','Уровни','Достижения','Ежедневные задания','Другое','Не использую'];
let survey = null;
let draft = {};

export function studyPage(ui) {
  const r = ui.state.research;
  if (survey && r.participant) return questionnaire(ui);
  const {heading,card,button,escape} = ui;
  return heading('Исследование','Два теста и две анкеты')+
    card('<p>Участие добровольное. Согласование со школой и необходимые согласия оформляет организатор.</p>'+
      (r.participant?'<strong>Код участника · '+escape(r.participant)+'</strong>':
      '<label class="field"><span>Код участника</span><input id="participant" maxlength="24" autocapitalize="off" autocomplete="off" placeholder="Код от организатора"></label>'+
      '<label><input id="consent" type="checkbox"> Я участвую добровольно</label><p id="study-error" role="alert"></p>'+
      button('Начать','study-register')))+
    (r.participant ? steps.map(([key,label],i)=>{
      const enabled=!r[key] && (i===0 || r[steps[i-1][0]]);
      const note=i===2 ? card('<h2>Занятия в тренажёре</h2><p>Открой итоговый тест после согласованного с учителем периода занятий.</p>'):'';
      return note+card('<h2>'+label+'</h2>'+(r[key]?'<p>Заполнено ✓</p>': enabled?button('Открыть','study-open',key):'<p>Сначала заполни предыдущий этап.</p>'));
    }).join('')+
    card('<h2>Экспорт организатору</h2><div class="actions">'+button('Сохранить JSON','study-export','json')+button('Сохранить CSV','study-export','csv','secondary')+'</div>') : '')+
    button('Назад в профиль','go','settings','secondary');
}
function questionnaire(ui) {
  const before=survey==='beforeSurvey', items=before?common:[...common,...final];
  const {button,heading,card,escape}=ui;
  const picker=(key,label,options) => card('<label class="field"><span>'+escape(label)+'</span><select data-study-field="'+key+'"><option value="">Пропустить</option>'+
    options.map(([value,text])=>'<option value="'+escape(value)+'"'+(String(draft[key])===String(value)?' selected':'')+'>'+escape(text)+'</option>').join('')+'</select></label>');
  const free=(key,label)=>card('<label class="field"><span>'+escape(label)+'</span><textarea data-study-field="'+key+'" maxlength="500">'+escape(draft[key]??'')+'</textarea></label>');
  return heading(before?'Первичная анкета':'Итоговая анкета','Добровольно · без личных данных')+
    '<p>1 — совершенно не согласен, 5 — полностью согласен. Вопросы можно пропускать.</p>'+
    items.map((label,i)=>picker('q'+(i+1),label,[[1,1],[2,2],[3,3],[4,4],[5,5],...(!before&&i>=4?[[0,'Не пользовался']]:[])])).join('')+
    (before?
      picker('q5','Какие слова вызывают у вас наибольшие трудности?',['Существительные','Глаголы','Прилагательные','Причастия и другие формы','Затрудняюсь ответить'].map(x=>[x,x]))+
      picker('q6','Как часто вы проверяете ударение в словаре?',['Часто','Иногда','Редко','Никогда'].map(x=>[x,x]))+
      picker('q7','Пользовались ли вы приложениями для русского языка?',[['Да','Да'],['Нет','Нет']])+
      card('<h2>Какие игровые элементы помогают вам заниматься?</h2><div class="stack">'+mechanics.map(x=>'<label><input type="checkbox" data-study-field="q8" value="'+x+'"'+(draft.q8?.includes(x)?' checked':'')+'> '+x+'</label>').join('')+'</div>')+
      free('q9','Что помогает запоминать ударения?'):
      free('q11','В течение скольких дней вы занимались?')+free('q12','Что помогало учиться больше всего?')+free('q13','Что можно улучшить?'))+
    '<p>Не указывай имена, контакты и другие личные сведения.</p><div class="actions">'+button('Сохранить анкету','study-save')+button('Отмена','study-cancel','','secondary')+'</div>';
}
export function studyField(field) {
  const key=field.dataset.studyField;
  if(!survey||!key)return;
  if(field.type==='checkbox') {
    const existing=draft[key]??[];
    draft[key]=field.checked?[...existing,field.value]:existing.filter(x=>x!==field.value);
  } else {
    const scale=survey==='beforeSurvey'?Number(key.slice(1))<=4:Number(key.slice(1))<=10;
    draft[key]=field.value===''?null:scale?Number(field.value):field.value;
  }
}
export function studyAction(action,value,ui) {
  const r=ui.state.research;
  if(action==='study-register') {
    const code=document.querySelector('#participant').value.trim();
    if(!/^[A-Za-z0-9_-]{3,24}$/.test(code)||!document.querySelector('#consent').checked) {
      document.querySelector('#study-error').textContent='Введи код из 3–24 латинских букв, цифр, дефисов или подчёркиваний и подтверди согласие.';return;
    }
    r.participant=code;r.researchStart=Date.now();ui.save();ui.render();
  } else if(action==='study-open') {
    const index=steps.findIndex(([key])=>key===value);
    if(!r.participant||index<0||r[value]||(index>0&&!r[steps[index-1][0]]))return;
    if(ui.diagnostic[value])ui.newQuiz(ui.diagnostic[value],null,value);
    else {survey=value;draft={};window.scrollTo(0,0);ui.render();}
  } else if(action==='study-save'&&survey&&!r[survey]) {
    const before=survey==='beforeSurvey';
    const result={date:new Date().toLocaleDateString('sv-SE')};
    for(let i=1;i<=(before?4:10);i++)result['q'+i]=null;
    Object.assign(result,draft);
    if(before)result.q8??=[];
    r[survey]=result;survey=null;draft={};ui.save();window.scrollTo(0,0);ui.render();
  } else if(action==='study-cancel') {
    survey=null;draft={};ui.render();
  } else if(action==='study-export'&&r.participant) {
    download(ui.state,value);
  }
}
export function finishDiagnostic(state, stage, session) {
  const r=state.research;
  if(r[stage])return;
  r[stage]=session;
  if(stage==='beforeTest')r.trainingStart=session.finishedAt;
  if(stage==='afterTest')r.trainingEnd=session.startedAt;
}
export function exportStudy(state) {
  const r=state.research, start=r.trainingStart??Infinity, end=r.trainingEnd??Infinity;
  return {...r,attempts:state.attempts.filter(x=>x.time>=start&&x.time<=end),
    sessions:state.sessions.filter(x=>x.startedAt>=start&&x.finishedAt<=end)};
}
function download(state, type) {
  const data=exportStudy(state), csv=type==='csv';
  const rows=[['code','stage','question','category','value','correct']];
  const push=(stage,question,category,value,correct='')=>rows.push([data.participant,stage,question,category,value,correct]);
  for(const [stage] of steps) {
    const item=data[stage];
    if(!item)continue;
    if(item.answers) {
      push(stage,'score','',item.score);
      for(const a of item.answers)push(stage,a.id,a.category,a.selected,a.correct);
    } else for(const [key,value] of Object.entries(item))push(stage,key,'',value);
  }
  push('training','sessions','',data.sessions.length);
  push('training','seconds','',data.sessions.reduce((sum,x)=>sum+x.durationSeconds,0));
  push('training','attempts','',data.attempts.length);
  push('training','correct','',data.attempts.filter(x=>x.correct).length);
  push('training','days','',new Set(data.attempts.map(x=>x.date)).size);
  const quote=value=>{
    const text=String(value??'').replace(/^[=+@\t\r]|^-(?!\d+$)/,char=>"'"+char);
    return '"'+text.replace(/"/g,'""')+'"';
  };
  const payload=csv?'\uFEFF'+rows.map(row=>row.map(quote).join(';')).join('\r\n'):JSON.stringify(data,null,2);
  const url=URL.createObjectURL(new Blob([payload],{type:csv?'text/csv;charset=utf-8':'application/json'}));
  const link=document.createElement('a');
  link.href=url;link.download='udarnik-'+data.participant+(csv?'.csv':'.json');
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
