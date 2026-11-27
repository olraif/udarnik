export const stages = [
  [0, 'Поляна первых слов', 'Новичок'],
  [100, 'Лес ударений', 'Путешественник'],
  [250, 'Гора трудных слов', 'Следопыт'],
  [450, 'Башня грамотности', 'Страж слов'],
  [700, 'Замок правил', 'Рыцарь грамотности'],
  [1000, 'Крепость знаний', 'Хранитель орфоэпии'],
  [1400, 'Тронный зал', 'Лорд правильной речи'],
  [1800, 'Королевская вершина', 'Король орфоэпии'],
].map(([xp, location, title], i) => ({xp, location, title, questions:i===7?20:10, required:i===7?16:8}));

export function frontier(xp, passed) {
  return stages.reduce((open, stage, i) => i <= passed && xp >= stage.xp ? i : open, 0);
}
export function titleIndex(xp, passed) {
  return Math.min(frontier(xp, passed), passed === stages.length ? 7 : 6);
}
export function completeLearning(xp, passed, challenge, count, score) {
  const target = challenge ?? (passed === 0 && count === 10 ? 0 : null);
  if (target === null || target !== passed || target > frontier(xp, passed)) return passed;
  const stage = stages[target];
  return stage && count === stage.questions && score >= stage.required ? passed + 1 : passed;
}
