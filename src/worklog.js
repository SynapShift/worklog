export const entryTypes = {
  work: { label: '完成', color: '#2563eb', icon: 'checkmark-circle' },
  todo: { label: '跟进', color: '#b45309', icon: 'time' },
  risk: { label: '风险', color: '#dc2626', icon: 'alert-circle' },
  note: { label: '备注', color: '#64748b', icon: 'document-text' },
  life: { label: '生活', color: '#9333ea', icon: 'heart' },
};

const tagMap = {
  '#work': 'work',
  '#todo': 'todo',
  '#risk': 'risk',
  '#note': 'note',
  '#life': 'life',
};

export function getISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseEntry(rawText, options = {}) {
  const shouldPolish = options.polish !== false;
  const normalized = rawText.trim().replace(/\s+/g, ' ');
  const tag = Object.keys(tagMap).find((item) => normalized.startsWith(item));
  const type = options.type || (tag ? tagMap[tag] : inferType(normalized));
  const content = (options.content || (tag ? normalized.replace(tag, '').trim() : normalized)).trim() || '未填写内容';
  const project = (options.project || '').trim() || inferProject(content);

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    rawText,
    type,
    project,
    date: options.date || getISODate(),
    status: type === 'work' ? 'done' : 'open',
    formalText: shouldPolish ? toFormalText(type, content, project) : content,
  };
}

export function buildReport(entries) {
  const work = entries.filter((entry) => entry.type === 'work');
  const todo = entries.filter((entry) => entry.type === 'todo');
  const risk = entries.filter((entry) => entry.type === 'risk');
  const life = entries.filter((entry) => entry.type === 'life');

  return `完成事项
${toLines(work, '暂无完成事项记录')}

问题与风险
${toLines(risk, '暂无明显风险')}

生活记录
${toLines(life, '暂无生活记录')}

后续计划
${toLines(todo, '暂无待跟进事项')}`;
}

function toLines(entries, empty) {
  return entries.length ? entries.map((entry) => `- ${entry.formalText}`).join('\n') : `- ${empty}`;
}

function inferType(text) {
  if (/生活|运动|吃饭|睡眠|家务|旅行|朋友|家人|健康|阅读/.test(text)) return 'life';
  if (/风险|阻塞|不支持|延期|问题|依赖|卡住/.test(text)) return 'risk';
  if (/跟进|待办|需要|确认|补充|下周|计划|准备|安排/.test(text)) return 'todo';
  if (/完成|上线|验收|发布|梳理|设计|评审|对齐/.test(text)) return 'work';
  return 'note';
}

function inferProject(text) {
  const hints = ['推荐问句', '订阅卡片', 'AB 实验', '服务端', '上线效果', '数据看板', '需求评审'];
  return hints.find((hint) => text.includes(hint)) || text.split(/[，。,. ]/).filter(Boolean)[0]?.slice(0, 12) || '未归类';
}

function toFormalText(type, content, project) {
  if (type === 'work') return `完成${content.replace(/^完成/, '')}，确认关键链路与交付结果符合预期。`;
  if (type === 'todo') return `持续跟进${content.replace(/^跟进/, '')}，确保相关事项按计划闭环。`;
  if (type === 'risk') return `当前存在${content}，需确认影响范围并推动解决方案。`;
  if (type === 'life') return `记录${content}，为生活安排和个人状态复盘提供参考。`;
  return `记录${project}相关信息，为后续复盘和工作沉淀提供参考。`;
}
