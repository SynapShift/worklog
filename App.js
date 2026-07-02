import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { entryTypes, getISODate, parseEntry } from './src/worklog';

const tabs = [
  { key: 'calendar', label: '日历', icon: 'calendar-sharp' },
  { key: 'projects', label: '项目', icon: 'folder-sharp' },
  { key: 'report', label: '报告', icon: 'reader-sharp' },
  { key: 'modules', label: '心愿', icon: 'sparkles-sharp' },
  { key: 'settings', label: '设置', icon: 'settings-sharp' },
];

const entryTemplates = {
  work: { label: 'work', projectLabel: '项目名', contentLabel: '进展', placeholder: '今天完成了什么进展...' },
  todo: { label: 'todo', projectLabel: '项目名', contentLabel: '待跟进', placeholder: '接下来需要跟进什么...' },
  risk: { label: 'risk', projectLabel: '项目名', contentLabel: '风险', placeholder: '当前有什么风险或阻塞...' },
  note: { label: 'note', projectLabel: '主题', contentLabel: '备注', placeholder: '记录一点补充信息...' },
  life: { label: 'life', projectLabel: '生活主题', contentLabel: '内容', placeholder: '记录生活安排、状态或想法...' },
};

const iconMarks = {
  add: '+',
  close: 'x',
  copy: '复',
  trash: '删',
  checkmark: '已',
  'calendar-sharp': '日',
  'folder-sharp': '项',
  'reader-sharp': '报',
  'sparkles-sharp': '愿',
  'settings-sharp': '设',
  sparkles: '想',
  checkbox: '完',
  'checkmark-circle': '完',
  time: '跟',
  'alert-circle': '险',
  'document-text': '记',
  heart: '生',
  'arrow-forward-circle': '计',
  flag: '年',
  ribbon: '阶',
};

const sparklesSharpPaths = [
  'M208,512,155.62,372.38,16,320l139.62-52.38L208,128l52.38,139.62L400,320,260.38,372.38Z',
  'M88,176,64.43,111.57,0,88,64.43,64.43,88,0l23.57,64.43L176,88l-64.43,23.57Z',
  'M400,256l-31.11-80.89L288,144l80.89-31.11L400,32l31.11,80.89L512,144l-80.89,31.11Z',
];

const storageKeys = {
  authToken: 'worklog.authToken',
  authUser: 'worklog.authUser',
  entries: 'worklog.entries',
  goals: 'worklog.goals',
  ideas: 'worklog.ideas',
  wishes: 'worklog.wishes',
  onboardingDone: 'worklog.onboardingDone',
  projectMeta: 'worklog.projectMeta',
  modelConfig: 'worklog.modelConfig',
  lastSyncedAt: 'worklog.lastSyncedAt',
  reportKind: 'worklog.reportKind',
  reportMaterials: 'worklog.reportMaterials',
  reportTemplate: 'worklog.reportTemplate',
  reviews: 'worklog.reviews',
};

const reportRangeOptions = [
  { key: 'current', label: '本周' },
  { key: 'previous', label: '上周' },
  { key: 'recent7', label: '近 7 天' },
  { key: 'month', label: '本月' },
  { key: 'all', label: '全部' },
  { key: 'custom', label: '自定义' },
];

const projectFilterOptions = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '推进中' },
  { key: 'todo', label: '待推进' },
  { key: 'risk', label: '有风险' },
  { key: 'stale', label: '待更新' },
  { key: 'archived', label: '已归档' },
];

const reportKindOptions = [
  { key: 'weekly', label: '周报', range: 'current' },
  { key: 'project', label: '项目复盘', range: 'recent7' },
  { key: 'stage', label: '阶段总结', range: 'month' },
  { key: 'daily', label: '今日总结', range: 'custom' },
];

const reportMaterialOptions = [
  { key: 'includeRisk', label: '风险' },
  { key: 'includeLife', label: '生活' },
  { key: 'includeGoals', label: '目标' },
  { key: 'includeIdeas', label: '灵感清单' },
];

const defaultReportMaterials = {
  includeRisk: true,
  includeLife: true,
  includeGoals: true,
  includeIdeas: true,
};

const onboardingProfiles = [
  { key: 'work', label: '工作复盘', project: '核心项目', content: '完成一次关键推进，并记录后续要跟进的事项。' },
  { key: 'study', label: '学习成长', project: '学习计划', content: '记录今天学到的内容，以及下一步要练习什么。' },
  { key: 'life', label: '生活安排', project: '生活', content: '记录今天的安排、状态或一个想保留下来的想法。' },
  { key: 'mixed', label: '混合记录', project: '日常推进', content: '把工作、学习和生活里的碎片先轻轻记下来。' },
];

const appVersion = '0.1.0';

const modelProviders = [
  {
    key: 'deepseek',
    label: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-v4-flash',
    hint: '适合中文整理和低成本试用',
  },
  {
    key: 'openai',
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: '',
    hint: '填入你要使用的 OpenAI 模型名',
  },
  {
    key: 'openrouter',
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: '',
    hint: '适合统一接入多家模型',
  },
  {
    key: 'siliconflow',
    label: '硅基流动',
    endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
    model: '',
    hint: '适合国内网络环境下接入开源模型',
  },
  {
    key: 'ollama',
    label: 'Ollama',
    endpoint: 'http://localhost:11434/v1/chat/completions',
    model: '',
    hint: '适合本机或局域网本地模型',
  },
  {
    key: 'custom',
    label: '自定义',
    endpoint: '',
    model: '',
    hint: '手动填写兼容 Chat Completions 的接口',
  },
];

const defaultReportTemplate = `# {报告标题}

时间范围：{起始日期} - {结束日期}
项目范围：{项目范围}
记录数量：{记录数}

## 完成事项
{完成事项}

## 问题风险
{问题风险}

## 生活记录
{生活记录}

## 后续计划
{后续计划}

## 目标提醒
{目标提醒}

## 灵感与清单
{灵感清单}`;

const starterEntries = [];

export default function App() {
  const savedModelConfig = useMemo(() => loadStored(storageKeys.modelConfig, {}), []);
  const syncTimerRef = useRef(null);
  const undoTimerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [activeEntryType, setActiveEntryType] = useState('work');
  const [entryProject, setEntryProject] = useState('');
  const [entryContent, setEntryContent] = useState('');
  const [draft, setDraft] = useState(null);
  const [draftMode, setDraftMode] = useState('direct');
  const [draftNotice, setDraftNotice] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [highlightedEntryId, setHighlightedEntryId] = useState('');
  const [copyNotice, setCopyNotice] = useState('');
  const [modelLoading, setModelLoading] = useState(false);
  const [reviewLoadingKey, setReviewLoadingKey] = useState('');
  const [reviewNotice, setReviewNotice] = useState({ key: '', text: '' });
  const initialReportRange = useMemo(() => getDateRangeByPreset('current', starterEntries), []);
  const [searchQuery, setSearchQuery] = useState('');
  const [onboardingOpen, setOnboardingOpen] = useState(() => !loadStored(storageKeys.onboardingDone, false) && loadStored(storageKeys.entries, starterEntries).length === 0);
  const [onboardingProfile, setOnboardingProfile] = useState(onboardingProfiles[0].key);
  const [reportRange, setReportRange] = useState('current');
  const [reportKind, setReportKind] = useState(() => loadStored(storageKeys.reportKind, 'weekly'));
  const [reportMaterials, setReportMaterials] = useState(() => loadStored(storageKeys.reportMaterials, defaultReportMaterials));
  const [reportProject, setReportProject] = useState('all');
  const [reportStartDate, setReportStartDate] = useState(initialReportRange.start);
  const [reportEndDate, setReportEndDate] = useState(initialReportRange.end);
  const [reportTemplate, setReportTemplate] = useState(() => loadStored(storageKeys.reportTemplate, defaultReportTemplate));
  const [reportAdvancedOpen, setReportAdvancedOpen] = useState(false);
  const [modelAdvancedOpen, setModelAdvancedOpen] = useState(false);
  const [dataNotice, setDataNotice] = useState('');
  const [undoEntry, setUndoEntry] = useState(null);
  const [modelProvider, setModelProvider] = useState(savedModelConfig.provider || inferModelProvider(savedModelConfig.endpoint));
  const [modelEndpoint, setModelEndpoint] = useState(savedModelConfig.endpoint || '');
  const [modelName, setModelName] = useState(savedModelConfig.model || '');
  const [modelApiKey, setModelApiKey] = useState(savedModelConfig.apiKey || '');
  const [modelTestStatus, setModelTestStatus] = useState('');
  const [modelTestLoading, setModelTestLoading] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authToken, setAuthToken] = useState(() => loadStored(storageKeys.authToken, ''));
  const [authUser, setAuthUser] = useState(() => loadStored(storageKeys.authUser, null));
  const [authMode, setAuthMode] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [syncReady, setSyncReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState(authToken ? '准备同步' : '未登录');
  const [lastSyncedAt, setLastSyncedAt] = useState(() => loadStored(storageKeys.lastSyncedAt, ''));
  const [activeModule, setActiveModule] = useState('goals');
  const [moduleInput, setModuleInput] = useState('');
  const [stageGoalInput, setStageGoalInput] = useState('');
  const [yearGoalInput, setYearGoalInput] = useState('');
  const [goals, setGoals] = useState(() => loadStored(storageKeys.goals, {
    stage: [],
    year: [],
  }));
  const [ideas, setIdeas] = useState(() => loadStored(storageKeys.ideas, []));
  const [wishes, setWishes] = useState(() => loadStored(storageKeys.wishes, []));
  const [entries, setEntries] = useState(() => loadStored(storageKeys.entries, starterEntries));
  const [projectMeta, setProjectMeta] = useState(() => loadStored(storageKeys.projectMeta, {}));
  const [reviews, setReviews] = useState(() => sanitizeReviews(loadStored(storageKeys.reviews, createEmptyReviews())));
  const [selectedDate, setSelectedDate] = useState(getISODate());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [selectedProjectKey, setSelectedProjectKey] = useState('');

  useEffect(() => saveStored(storageKeys.entries, entries), [entries]);
  useEffect(() => saveStored(storageKeys.goals, goals), [goals]);
  useEffect(() => saveStored(storageKeys.ideas, ideas), [ideas]);
  useEffect(() => saveStored(storageKeys.wishes, wishes), [wishes]);
  useEffect(() => saveStored(storageKeys.projectMeta, projectMeta), [projectMeta]);
  useEffect(() => saveStored(storageKeys.reviews, reviews), [reviews]);
  useEffect(() => saveStored(storageKeys.reportKind, reportKind), [reportKind]);
  useEffect(() => saveStored(storageKeys.reportMaterials, reportMaterials), [reportMaterials]);
  useEffect(() => saveStored(storageKeys.reportTemplate, reportTemplate), [reportTemplate]);
  useEffect(() => {
    saveStored(storageKeys.modelConfig, {
      provider: modelProvider,
      endpoint: modelEndpoint,
      model: modelName,
      apiKey: modelApiKey,
    });
  }, [modelProvider, modelEndpoint, modelName, modelApiKey]);

  useEffect(() => {
    if (!authToken) return;
    hydrateCloudData(authToken);
  }, []);

  useEffect(() => {
    if (!authToken || !syncReady) return;

    setSyncStatus('待同步');
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      pushCloudData(authToken);
    }, 900);

    return () => clearTimeout(syncTimerRef.current);
  }, [authToken, syncReady, entries, goals, ideas, wishes, projectMeta, reviews, modelProvider, modelEndpoint, modelName, reportKind, reportMaterials, reportTemplate]);

  useEffect(() => () => clearTimeout(undoTimerRef.current), []);

  const entriesByDate = useMemo(() => {
    return entries.reduce((acc, entry) => {
      acc[entry.date] = acc[entry.date] || [];
      acc[entry.date].push(entry);
      return acc;
    }, {});
  }, [entries]);
  const searchResults = useMemo(() => searchEntries(entries, searchQuery), [entries, searchQuery]);
  const commonProjects = useMemo(() => getCommonProjects(entries), [entries]);
  const projectSummaries = useMemo(() => buildProjectSummaries(entries, goals, projectMeta), [entries, goals, projectMeta]);
  const reportProjects = useMemo(() => getReportProjects(entries), [entries]);
  const normalizedReportRange = useMemo(() => normalizeDateRange(reportStartDate, reportEndDate), [reportStartDate, reportEndDate]);
  const reportEntries = useMemo(() => filterEntriesByProject(filterEntriesForReport(entries, normalizedReportRange), reportProject), [entries, normalizedReportRange, reportProject]);
  const reportProjectLabel = useMemo(() => getProjectLabel(reportProject, reportProjects), [reportProject, reportProjects]);
  const reportContext = useMemo(() => ({ goals, ideas, wishes, kind: reportKind, materials: reportMaterials }), [goals, ideas, wishes, reportKind, reportMaterials]);
  const report = useMemo(() => buildReportFromTemplate(reportEntries, reportTemplate, normalizedReportRange, reportRange, reportProjectLabel, reportContext), [reportEntries, reportTemplate, normalizedReportRange, reportRange, reportProjectLabel, reportContext]);
  const reportSections = useMemo(() => buildReportSections(reportEntries), [reportEntries]);
  const weeklyRange = useMemo(() => getDateRangeByPreset('current', entries), [entries]);
  const weeklyEntries = useMemo(() => filterEntriesForReport(entries, weeklyRange), [entries, weeklyRange]);
  const materialSummary = useMemo(() => buildMaterialSummary(goals, ideas, wishes), [goals, ideas, wishes]);
  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);
  const weekDays = useMemo(() => getWeekDays(parseISODate(selectedDate)), [selectedDate]);
  const visibleDays = calendarExpanded ? calendarDays : weekDays;
  const authPasswordStrength = useMemo(() => getPasswordStrength(authPassword), [authPassword]);
  const dailyReviewKey = selectedDate;
  const dailyReview = reviews.daily?.[dailyReviewKey];
  const weeklyReviewKey = useMemo(() => getReviewKey('weekly', weeklyRange, 'all', weeklyEntries), [weeklyRange, weeklyEntries]);
  const weeklyReview = reviews.weekly?.[weeklyReviewKey];
  const reportReviewKey = useMemo(() => getReviewKey(reportKind, normalizedReportRange, reportProject, reportEntries), [reportKind, normalizedReportRange, reportProject, reportEntries]);
  const reportReview = reviews.report?.[reportReviewKey];
  const calendarPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => {
      return Math.abs(gesture.dy) > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.15;
    },
    onMoveShouldSetPanResponder: (_, gesture) => {
      return Math.abs(gesture.dy) > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.15;
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 30) {
        setCalendarExpanded(true);
      }

      if (gesture.dy < -30) {
        setCalendarExpanded(false);
      }
    },
    onPanResponderTerminationRequest: () => false,
  }), []);

  useEffect(() => {
    if (!projectSummaries.length) {
      if (selectedProjectKey) setSelectedProjectKey('');
      return;
    }

    if (!projectSummaries.some((project) => project.key === selectedProjectKey)) {
      setSelectedProjectKey(projectSummaries[0].key);
    }
  }, [projectSummaries, selectedProjectKey]);

  async function handleCreateDraft(mode) {
    const canUseAI = mode === 'ai' && modelEndpoint.trim() && modelName.trim() && modelApiKey.trim();
    const localDraft = createEntryDraft({ polish: false });

    if (mode === 'direct') {
      commitEntry(localDraft);
      return;
    }

    if (!canUseAI) {
      commitEntry(localDraft);
      return;
    }

    setModelLoading(true);
    setDraftNotice('');

    try {
      const aiDraft = await polishWithModel({
        endpoint: modelEndpoint,
        model: modelName,
        apiKey: modelApiKey,
        rawText: localDraft.rawText,
        fallback: localDraft,
      });
      setDraft({ ...localDraft, ...aiDraft, rawText: localDraft.rawText });
      setDraftMode('ai');
    } catch {
      commitEntry(localDraft);
    } finally {
      setModelLoading(false);
    }
  }

  function handleConfirmDraft() {
    if (!draft) return;
    commitEntry(draft);
  }

  function commitEntry(entry) {
    setEntries([entry, ...entries]);
    setSelectedDate(entry.date);
    setCalendarMonth(parseISODate(entry.date));
    setHighlightedEntryId(entry.id);
    setDraft(null);
    setDraftMode('direct');
    setDraftNotice('');
    setEntryProject('');
    setEntryContent('');
    setComposerOpen(false);
    setTimeout(() => setHighlightedEntryId(''), 1500);
  }

  function openComposer() {
    setDraft(null);
    setDraftMode('direct');
    setDraftNotice('');
    setComposerOpen(true);
  }

  function closeComposer() {
    setComposerOpen(false);
    setDraft(null);
    setDraftMode('direct');
    setDraftNotice('');
    setModelLoading(false);
  }

  function handleDeleteEntry(entryId) {
    const index = entries.findIndex((entry) => entry.id === entryId);
    if (index < 0) return;

    const entry = entries[index];
    setEntries(entries.filter((item) => item.id !== entryId));
    setUndoEntry({ entry, index });
    clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoEntry(null), 4200);
  }

  function handleUndoDelete() {
    if (!undoEntry) return;

    setEntries((current) => {
      const withoutDuplicate = current.filter((entry) => entry.id !== undoEntry.entry.id);
      const next = [...withoutDuplicate];
      next.splice(Math.min(undoEntry.index, next.length), 0, undoEntry.entry);
      return next;
    });
    setUndoEntry(null);
    clearTimeout(undoTimerRef.current);
  }

  function handleSaveEntry(entryId, updates) {
    setEntries(entries.map((entry) => (
      entry.id === entryId ? { ...entry, ...updates } : entry
    )));
  }

  function getCloudPayload() {
    return {
      entries,
      goals,
      ideas,
      wishes,
      projectMeta,
      reviews,
      reportKind,
      reportMaterials,
      reportTemplate,
      modelConfig: {
        provider: modelProvider,
        endpoint: modelEndpoint,
        model: modelName,
      },
    };
  }

  function applyCloudPayload(payload) {
    if (!payload) return;
    if (Array.isArray(payload.entries)) setEntries(payload.entries);
    if (payload.goals) setGoals(payload.goals);
    if (Array.isArray(payload.ideas)) setIdeas(payload.ideas);
    if (Array.isArray(payload.wishes)) setWishes(payload.wishes);
    if (payload.projectMeta && typeof payload.projectMeta === 'object') setProjectMeta(payload.projectMeta);
    if (payload.reviews) setReviews(sanitizeReviews(payload.reviews));
    if (typeof payload.reportKind === 'string') setReportKind(payload.reportKind);
    if (payload.reportMaterials && typeof payload.reportMaterials === 'object') setReportMaterials({ ...defaultReportMaterials, ...payload.reportMaterials });
    if (typeof payload.reportTemplate === 'string') setReportTemplate(payload.reportTemplate);
    if (payload.modelConfig) {
      setModelProvider(payload.modelConfig.provider || inferModelProvider(payload.modelConfig.endpoint));
      setModelEndpoint(payload.modelConfig.endpoint || '');
      setModelName(payload.modelConfig.model || '');
    }
  }

  function markSynced(status = '云端已同步') {
    const nextSyncedAt = new Date().toISOString();
    setLastSyncedAt(nextSyncedAt);
    saveStored(storageKeys.lastSyncedAt, nextSyncedAt);
    setSyncStatus(status);
  }

  async function handleAuthSubmit() {
    if (!isValidEmail(authEmail)) {
      setSyncStatus('请输入有效邮箱');
      return;
    }

    if (authPassword.length < 6) {
      setSyncStatus('请输入至少 6 位密码');
      return;
    }

    setAuthLoading(true);
    setSyncReady(false);
    setSyncStatus(authMode === 'register' ? '正在注册' : '正在登录');

    try {
      const result = await cloudRequest(`/api/auth/${authMode}`, {
        method: 'POST',
        body: JSON.stringify({ email: authEmail.trim(), password: authPassword }),
      });

      setAuthToken(result.token);
      setAuthUser(result.user);
      saveStored(storageKeys.authToken, result.token);
      saveStored(storageKeys.authUser, result.user);
      setAuthPassword('');
      await hydrateCloudData(result.token, true);
    } catch (error) {
      setSyncStatus(error.message || '登录失败');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    if (authToken) {
      cloudRequest('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
    }

    setAuthToken('');
    setAuthUser(null);
    setSyncReady(false);
    setSyncStatus('未登录');
    saveStored(storageKeys.authToken, '');
    saveStored(storageKeys.authUser, null);
  }

  async function hydrateCloudData(token, pushIfEmpty = false) {
    try {
      setSyncStatus('正在拉取云端数据');
      const result = await cloudRequest('/api/data', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (result.payload) {
        applyCloudPayload(result.payload);
        markSynced();
        setTimeout(() => setSyncReady(true), 0);
        return;
      }

      setSyncReady(true);
      if (pushIfEmpty) {
        await pushCloudData(token);
        return;
      }

      setSyncStatus('云端暂无数据');
    } catch (error) {
      if (/过期|登录|Unauthorized|401/.test(error.message)) {
        setAuthToken('');
        setAuthUser(null);
        saveStored(storageKeys.authToken, '');
        saveStored(storageKeys.authUser, null);
      }
      setSyncStatus(error.message || '同步失败');
    }
  }

  async function pushCloudData(token = authToken) {
    if (!token) return;

    try {
      setSyncStatus('正在同步');
      await cloudRequest('/api/data', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payload: getCloudPayload() }),
      });
      markSynced();
    } catch (error) {
      setSyncStatus(error.message || '同步失败');
    }
  }

  function getPortableData() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      entries,
      goals,
      ideas,
      wishes,
      projectMeta,
      reviews,
      reportKind,
      reportMaterials,
      reportTemplate,
      modelConfig: {
        provider: modelProvider,
        endpoint: modelEndpoint,
        model: modelName,
      },
    };
  }

  function applyPortableData(data) {
    const payload = sanitizePortableData(data);
    setEntries(payload.entries);
    setGoals(payload.goals);
    setIdeas(payload.ideas);
    setWishes(payload.wishes);
    setProjectMeta(payload.projectMeta);
    setReviews(payload.reviews);
    setReportKind(payload.reportKind || 'weekly');
    setReportMaterials({ ...defaultReportMaterials, ...payload.reportMaterials });
    setReportTemplate(payload.reportTemplate || defaultReportTemplate);
    setModelProvider(payload.modelConfig.provider || inferModelProvider(payload.modelConfig.endpoint));
    setModelEndpoint(payload.modelConfig.endpoint || '');
    setModelName(payload.modelConfig.model || '');
    setDataNotice('已导入数据，API Key 不会从备份文件恢复');
  }

  function handleExportData() {
    const json = JSON.stringify(getPortableData(), null, 2);
    const filename = `worklog-backup-${getISODate()}.json`;

    if (Platform.OS === 'web' && globalThis.document && globalThis.Blob) {
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDataNotice('已导出 JSON 备份，模型 API Key 不会被导出');
      return;
    }

    if (globalThis.navigator?.clipboard?.writeText) {
      globalThis.navigator.clipboard.writeText(json);
      setDataNotice('已复制 JSON 备份，模型 API Key 不会被导出');
      return;
    }

    setDataNotice('当前环境暂不支持导出');
  }

  function handleImportData() {
    if (Platform.OS !== 'web' || !globalThis.document || !globalThis.FileReader) {
      setDataNotice('当前环境暂不支持选择文件导入');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result || '{}'));
          applyPortableData(data);
        } catch {
          setDataNotice('导入失败，请选择有效的 WorkLog JSON 文件');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function applyReportPreset(preset) {
    setReportRange(preset);

    if (preset === 'custom') return;

    const range = getDateRangeByPreset(preset, entries);
    setReportStartDate(range.start);
    setReportEndDate(range.end);
  }

  function handleReportStartChange(value) {
    setReportRange('custom');
    setReportStartDate(value);
  }

  function handleReportEndChange(value) {
    setReportRange('custom');
    setReportEndDate(value);
  }

  function handleReportKindChange(kindKey) {
    const option = reportKindOptions.find((item) => item.key === kindKey);
    if (!option) return;

    setReportKind(option.key);

    if (option.key === 'daily') {
      const today = getISODate();
      setReportRange('custom');
      setReportStartDate(today);
      setReportEndDate(today);
      return;
    }

    applyReportPreset(option.range);
  }

  function handleToggleReportMaterial(materialKey) {
    setReportMaterials({
      ...reportMaterials,
      [materialKey]: !reportMaterials[materialKey],
    });
  }

  function openReportWorkspace({ kind = 'weekly', range = 'current', project = 'all', includeAllMaterials = true } = {}) {
    const option = reportKindOptions.find((item) => item.key === kind);
    const nextRange = option?.range || range;
    setReportKind(kind);
    setReportProject(project);

    if (includeAllMaterials) {
      setReportMaterials({ ...defaultReportMaterials });
    }

    if (nextRange === 'custom' && kind === 'daily') {
      const today = getISODate();
      setReportRange('custom');
      setReportStartDate(today);
      setReportEndDate(today);
    } else {
      applyReportPreset(nextRange);
    }

    setActiveTab('report');
  }

  function handleResetReportTemplate() {
    setReportTemplate(defaultReportTemplate);
  }

  function handleSelectModelProvider(providerKey) {
    const provider = modelProviders.find((item) => item.key === providerKey) || modelProviders[modelProviders.length - 1];
    setModelProvider(provider.key);
    setModelTestStatus('');
    setModelAdvancedOpen(provider.key === 'custom');

    if (provider.endpoint) setModelEndpoint(provider.endpoint);
    if (provider.model) setModelName(provider.model);
  }

  function handleOpenProjectReport(projectKey) {
    openReportWorkspace({ kind: 'project', range: 'recent7', project: projectKey });
  }

  function handleRecordProject(projectLabel, type = 'work') {
    const today = getISODate();
    setSelectedDate(today);
    setCalendarMonth(parseISODate(today));
    setActiveEntryType(type);
    setEntryProject(projectLabel);
    setEntryContent('');
    setDraft(null);
    setDraftMode('direct');
    setDraftNotice('');
    setActiveTab('calendar');
    setComposerOpen(true);
  }

  function handleRenameProject(projectKey, nextLabel) {
    const label = String(nextLabel || '').trim();
    if (!label) return;

    const nextKey = normalizeProjectKey(label);
    if (!nextKey || nextKey === projectKey) return;

    setEntries((current) => current.map((entry) => {
      if (normalizeProjectKey(entry.project) !== projectKey) return entry;
      return {
        ...entry,
        project: label,
        rawText: `#${entry.type} ${label} ${entry.formalText}`.trim(),
      };
    }));

    setProjectMeta((current) => {
      const next = { ...current };
      const existing = next[projectKey];
      delete next[projectKey];
      if (existing) next[nextKey] = existing;
      return next;
    });
    setSelectedProjectKey(nextKey);
  }

  function handleArchiveProject(projectKey, archived) {
    setProjectMeta((current) => ({
      ...current,
      [projectKey]: {
        ...(current[projectKey] || {}),
        archived,
      },
    }));
  }

  async function handleTestModelConnection() {
    if (!modelEndpoint.trim() || !modelName.trim() || !modelApiKey.trim()) {
      setModelTestStatus('请先补齐服务商、模型名和 API Key');
      return;
    }

    setModelTestLoading(true);
    setModelTestStatus('正在测试连接');

    try {
      await testModelConnection({
        endpoint: modelEndpoint,
        model: modelName,
        apiKey: modelApiKey,
      });
      setModelTestStatus('连接成功，AI 润色可用');
    } catch (error) {
      setModelTestStatus(error.message || '连接失败，请检查 Key、模型名和网络');
    } finally {
      setModelTestLoading(false);
    }
  }

  function handleFinishOnboarding(profileKey = onboardingProfile) {
    const profile = onboardingProfiles.find((item) => item.key === profileKey) || onboardingProfiles[0];
    saveStored(storageKeys.onboardingDone, true);
    setOnboardingOpen(false);
    setActiveTab('calendar');
    setActiveEntryType(profile.key === 'life' ? 'life' : 'work');
    setEntryProject(profile.project);
    setEntryContent(profile.content);
    setComposerOpen(true);
  }

  function handleSkipOnboarding() {
    saveStored(storageKeys.onboardingDone, true);
    setOnboardingOpen(false);
  }

  function createEntryDraft({ polish }) {
    const type = activeEntryType;
    const content = entryContent.trim() || entryProject.trim() || '未填写内容';
    const project = entryProject.trim() || content;
    const rawText = `#${type} ${project}${entryContent.trim() ? ` ${entryContent.trim()}` : ''}`;

    return parseEntry(rawText, {
      polish,
      type,
      project,
      content,
      date: selectedDate,
    });
  }

  async function handleCopyReport() {
    setCopyNotice('');

    try {
      if (globalThis.navigator?.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(report);
        setCopyNotice('已复制');
        return;
      }

      setCopyNotice('当前环境暂不支持复制');
    } catch {
      setCopyNotice('复制失败');
    }
  }

  async function handleGenerateDailyReview() {
    await generateReview({
      scope: 'daily',
      key: dailyReviewKey,
      title: isToday(selectedDate) ? '今日点评' : `${formatMonthDay(parseISODate(selectedDate))} 点评`,
      range: { start: selectedDate, end: selectedDate },
      entries: entriesByDate[selectedDate] || [],
      projectLabel: '当日全部记录',
      goals,
      ideas,
      wishes,
    });
  }

  async function handleGenerateWeeklyReview() {
    await generateReview({
      scope: 'weekly',
      key: weeklyReviewKey,
      title: '本周点评',
      range: weeklyRange,
      entries: weeklyEntries,
      projectLabel: '本周全部项目',
      goals,
      ideas,
      wishes,
    });
  }

  async function handleGenerateReportReview() {
    await generateReview({
      scope: 'report',
      key: reportReviewKey,
      title: `${getReportTitle(reportKind, reportRange, normalizedReportRange, reportProjectLabel)}点评`,
      range: normalizedReportRange,
      entries: reportEntries,
      projectLabel: reportProjectLabel,
      goals,
      ideas,
      wishes,
      report,
    });
  }

  async function handleGenerateProjectReview(project) {
    if (!project) return;

    await generateReview({
      scope: 'projects',
      key: project.key,
      title: `${project.label}项目点评`,
      range: getEntriesDateRange(project.entries),
      entries: project.entries,
      projectLabel: project.label,
      goals,
      ideas,
      wishes,
      project,
    });
  }

  async function generateReview(context) {
    const loadingKey = `${context.scope}:${context.key}`;
    setReviewLoadingKey(loadingKey);
    setReviewNotice({ key: '', text: '' });

    try {
      const canUseAI = modelEndpoint.trim() && modelName.trim() && modelApiKey.trim();
      const nextReview = canUseAI
        ? await reviewWithModel({
          endpoint: modelEndpoint,
          model: modelName,
          apiKey: modelApiKey,
          context,
        })
        : buildLocalReview(context);

      saveReview(context.scope, context.key, {
        ...nextReview,
        id: loadingKey,
        title: context.title,
        scope: context.scope,
        source: canUseAI ? 'ai' : 'local',
        generatedAt: new Date().toISOString(),
      });

      if (!canUseAI) setReviewNotice({ key: loadingKey, text: '未配置模型，已使用本地规则生成点评' });
    } catch {
      saveReview(context.scope, context.key, {
        ...buildLocalReview(context),
        id: loadingKey,
        title: context.title,
        scope: context.scope,
        source: 'local',
        generatedAt: new Date().toISOString(),
      });
      setReviewNotice({ key: loadingKey, text: 'AI 点评连接失败，已使用本地规则生成点评' });
    } finally {
      setReviewLoadingKey('');
    }
  }

  function saveReview(scope, key, review) {
    setReviews((current) => {
      const safe = sanitizeReviews(current);
      return {
        ...safe,
        [scope]: {
          ...(safe[scope] || {}),
          [key]: normalizeReview(review),
        },
      };
    });
  }

  function handleAddGoal(period) {
    const text = period === 'stage' ? stageGoalInput.trim() : yearGoalInput.trim();
    if (!text) return;

    setGoals({
      ...goals,
      [period]: [createGoal(text), ...goals[period]],
    });

    if (period === 'stage') {
      setStageGoalInput('');
      return;
    }

    setYearGoalInput('');
  }

  function handleToggleGoal(period, goalId) {
    setGoals({
      ...goals,
      [period]: goals[period].map((goal) => (
        goal.id === goalId ? { ...goal, done: !goal.done } : goal
      )),
    });
  }

  function handleDeleteGoal(period, goalId) {
    setGoals({
      ...goals,
      [period]: goals[period].filter((goal) => goal.id !== goalId),
    });
  }

  function handleAddModuleItem() {
    const text = moduleInput.trim();
    if (!text) return;

    if (activeModule === 'goals') {
      setGoals({
        ...goals,
        stage: [createGoal(text), ...goals.stage],
      });
    }

    if (activeModule === 'ideas') {
      setIdeas([text, ...ideas]);
    }

    if (activeModule === 'wishes') {
      setWishes([text, ...wishes]);
    }

    setModuleInput('');
  }

  function convertGoalToEntry(period, goal) {
    const project = period === 'year' ? '年度目标' : '阶段性目标';
    const content = `${project}：${goal.text}`;
    commitEntry(parseEntry(`#todo ${project} ${content}`, {
      polish: false,
      type: 'todo',
      project,
      content,
      date: getISODate(),
    }));
    setActiveTab('calendar');
  }

  function convertModuleItemToEntry(moduleKey, text) {
    const config = {
      ideas: { type: 'note', project: '灵感', prefix: '灵感' },
      wishes: { type: 'todo', project: '想做的事情', prefix: '想做' },
    }[moduleKey];

    if (!config) return;

    const content = `${config.prefix}：${text}`;
    commitEntry(parseEntry(`#${config.type} ${config.project} ${content}`, {
      polish: false,
      type: config.type,
      project: config.project,
      content,
      date: getISODate(),
    }));
    setActiveTab('calendar');
  }

  return (
    <SafeAreaView style={[styles.shell, activeTab === 'modules' && styles.wishShell]}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        {activeTab === 'calendar' && (
          <View style={styles.tabPane}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.todayHeader}>
                <Text style={styles.todayEyebrow}>{isToday(selectedDate) ? '今天' : formatMonthDay(parseISODate(selectedDate))}</Text>
                <Text style={styles.todayTitle}>{formatFullDate(parseISODate(selectedDate))}</Text>
              </View>
              <View style={styles.calendarCard} {...calendarPanResponder.panHandlers}>
                <View style={styles.calendarToolbar}>
                  <Pressable style={styles.monthButton} onPress={() => {
                    if (calendarExpanded) {
                      setCalendarMonth(addMonths(calendarMonth, -1));
                      return;
                    }
                    const nextDate = addDays(parseISODate(selectedDate), -7);
                    setSelectedDate(getISODate(nextDate));
                    setCalendarMonth(nextDate);
                  }}>
                    <Text style={styles.monthButtonText}>‹</Text>
                  </Pressable>
                  <Text style={styles.monthTitle}>{calendarExpanded ? formatMonth(calendarMonth) : formatWeekRange(weekDays)}</Text>
                  <Pressable style={styles.monthButton} onPress={() => {
                    if (calendarExpanded) {
                      setCalendarMonth(addMonths(calendarMonth, 1));
                      return;
                    }
                    const nextDate = addDays(parseISODate(selectedDate), 7);
                    setSelectedDate(getISODate(nextDate));
                    setCalendarMonth(nextDate);
                  }}>
                    <Text style={styles.monthButtonText}>›</Text>
                  </Pressable>
                </View>
                <View style={styles.weekRow}>
                  {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
                    <Text key={day} style={styles.weekText}>{day}</Text>
                  ))}
                </View>
                <View style={styles.monthGrid}>
                  {visibleDays.map((day) => {
                    const count = entriesByDate[day.iso]?.length || 0;
                    const active = selectedDate === day.iso;
                    return (
                      <Pressable key={day.iso} style={[styles.monthDay, !day.inMonth && styles.mutedMonthDay, active && styles.activeMonthDay]} onPress={() => {
                        setSelectedDate(day.iso);
                        setCalendarMonth(day.date);
                      }}>
                        <Text style={[styles.monthDayText, active && styles.activeMonthDayText]}>{day.date.getDate()}</Text>
                        {count > 0 && <Text style={[styles.monthCount, active && styles.activeMonthCount]}>{count}</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <ReviewPrompt
                entries={weeklyEntries}
                projects={projectSummaries}
                materialSummary={materialSummary}
                review={weeklyReview}
                loading={reviewLoadingKey === `weekly:${weeklyReviewKey}`}
                onOpenMaterials={() => setActiveTab('modules')}
                onOpenReport={() => openReportWorkspace({ kind: 'weekly', range: 'current' })}
                onOpenReview={handleGenerateWeeklyReview}
              />
              <ReviewInsightCard
                eyebrow="AI Review"
                title={isToday(selectedDate) ? '今日点评' : '当日点评'}
                review={dailyReview}
                loading={reviewLoadingKey === `daily:${dailyReviewKey}`}
                emptyText="点评会检查当天推进、风险、待办和缺失证据。"
                notice={reviewNotice.key === `daily:${dailyReviewKey}` ? reviewNotice.text : ''}
                onGenerate={handleGenerateDailyReview}
              />
              <View style={styles.searchCard}>
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="搜索记录、项目、内容或日期..."
                  placeholderTextColor="#94a3b8"
                />
                {searchQuery.trim() ? (
                  <Text style={styles.searchMeta}>找到 {searchResults.length} 条记录</Text>
                ) : (
                  <Text style={styles.searchMeta}>输入关键词可搜索全部记录</Text>
                )}
              </View>
              {searchQuery.trim() ? (
                <>
                  <Text style={styles.sectionTitle}>搜索结果</Text>
                  {searchResults.length === 0 ? (
                    <Text style={styles.emptyText}>没有找到匹配记录。</Text>
                  ) : (
                    searchResults.map((entry) => (
                      <View key={entry.id} style={styles.searchResultItem}>
                        <Text style={styles.searchResultDate}>{formatFullDate(parseISODate(entry.date))}</Text>
                        <EntryCard
                          entry={entry}
                          highlighted={highlightedEntryId === entry.id}
                          onDelete={handleDeleteEntry}
                          onSave={handleSaveEntry}
                        />
                      </View>
                    ))
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>当日记录</Text>
                  {(entriesByDate[selectedDate] || []).length === 0 ? (
                <Text style={styles.emptyText}>这一天还没有记录。点击右下角 +，写下工作、生活或一个突然冒出来的想法。</Text>
                  ) : (
                entriesByDate[selectedDate].map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    highlighted={highlightedEntryId === entry.id}
                    onDelete={handleDeleteEntry}
                    onSave={handleSaveEntry}
                  />
                ))
                  )}
                </>
              )}
            </ScrollView>
            <Pressable style={styles.fab} onPress={openComposer}>
              <Glyph name="add" size={30} color="#fff" />
            </Pressable>
          </View>
        )}

        {activeTab === 'projects' && (
          <ProjectDashboard
            projects={projectSummaries}
            selectedKey={selectedProjectKey}
            onArchive={handleArchiveProject}
            onRename={handleRenameProject}
            onSelect={setSelectedProjectKey}
            onRecord={handleRecordProject}
            onReport={handleOpenProjectReport}
            projectReviews={reviews.projects}
            reviewLoadingKey={reviewLoadingKey}
            onReview={handleGenerateProjectReview}
          />
        )}

        {activeTab === 'report' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.reportCard}>
	              <View style={styles.reportHeader}>
                <View>
                  <Text style={styles.reportEyebrow}>Report Draft</Text>
                  <Text style={styles.reportTitle}>{getReportTitle(reportKind, reportRange, normalizedReportRange, reportProjectLabel)}</Text>
                </View>
                <View style={styles.reportCountBadge}>
                  <Text style={styles.reportCountText}>{reportEntries.length} 条记录</Text>
                </View>
              </View>
              <View style={styles.reportKindPanel}>
                <Text style={styles.filterLabel}>报告类型</Text>
                <View style={styles.reportKindRow}>
                  {reportKindOptions.map((option) => (
                    <Pressable
                      key={option.key}
                      style={[styles.reportKindChip, reportKind === option.key && styles.activeReportKindChip]}
                      onPress={() => handleReportKindChange(option.key)}
                    >
                      <Text style={[styles.reportKindText, reportKind === option.key && styles.activeReportKindText]}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.reportRangeSwitch}>
                {reportRangeOptions.map((option) => (
                  <Pressable
                    key={option.key}
                    style={[styles.reportRangeChip, reportRange === option.key && styles.activeReportRangeChip]}
                    onPress={() => applyReportPreset(option.key)}
                  >
                    <Text style={[styles.reportRangeText, reportRange === option.key && styles.activeReportRangeText]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
              {reportRange === 'custom' && (
                <View style={styles.reportDateRow}>
                  <View style={styles.reportDateField}>
                    <Text style={styles.fieldLabel}>起始时间</Text>
                    <TextInput
                      style={styles.dateInput}
                      value={reportStartDate}
                      onChangeText={handleReportStartChange}
                      placeholder="YYYY-MM-DD"
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={styles.reportDateField}>
                    <Text style={styles.fieldLabel}>结束时间</Text>
                    <TextInput
                      style={styles.dateInput}
                      value={reportEndDate}
                      onChangeText={handleReportEndChange}
                      placeholder="YYYY-MM-DD"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              )}
              <View style={styles.projectFilterPanel}>
                <Text style={styles.filterLabel}>项目范围</Text>
                <View style={styles.projectChipRow}>
                  {[
                    { key: 'all', label: '全部项目' },
                    ...reportProjects,
                  ].map((project) => (
                    <Pressable
                      key={project.key}
                      style={[styles.projectChip, reportProject === project.key && styles.activeProjectChip]}
                      onPress={() => setReportProject(project.key)}
                    >
                      <Text style={[styles.projectChipText, reportProject === project.key && styles.activeProjectChipText]} numberOfLines={1}>{project.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.reportMaterialPanel}>
                <Text style={styles.filterLabel}>纳入材料</Text>
                <View style={styles.reportKindRow}>
                  {reportMaterialOptions.map((option) => (
                    <Pressable
                      key={option.key}
                      style={[styles.materialChip, reportMaterials[option.key] && styles.activeMaterialChip]}
                      onPress={() => handleToggleReportMaterial(option.key)}
                    >
                      <Text style={[styles.materialText, reportMaterials[option.key] && styles.activeMaterialText]}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <MaterialSummaryInline summary={materialSummary} />
              </View>
              <Text style={styles.reportPreviewTitle}>报告预览</Text>
              <View style={styles.reportPreviewBox}>
                <Text style={styles.reportPreviewText}>{report}</Text>
              </View>
              <ReviewInsightCard
                embedded
                eyebrow="Report Review"
                title="点评这份报告"
                review={reportReview}
                loading={reviewLoadingKey === `report:${reportReviewKey}`}
                emptyText="检查报告是否有结果证据、风险闭环和下阶段重点。"
                notice={reviewNotice.key === `report:${reportReviewKey}` ? reviewNotice.text : ''}
                onGenerate={handleGenerateReportReview}
              />
              <Pressable style={styles.reportCopyButton} onPress={handleCopyReport}>
                <Glyph name="copy" size={17} color="#fff" />
                <Text style={styles.reportCopyText}>复制正式报告</Text>
              </Pressable>
              {copyNotice ? <Text style={styles.copyNotice}>{copyNotice}</Text> : null}
              <Pressable style={styles.advancedToggle} onPress={() => setReportAdvancedOpen(!reportAdvancedOpen)}>
                <Text style={styles.advancedToggleText}>{reportAdvancedOpen ? '收起高级设置' : '高级设置：报告模板'}</Text>
                <Text style={styles.advancedToggleIcon}>{reportAdvancedOpen ? '−' : '+'}</Text>
              </Pressable>
              {reportAdvancedOpen && (
                <>
                  <View style={styles.templatePanel}>
                    <View style={styles.templateHeader}>
                      <Text style={styles.reportSectionTitle}>报告模板</Text>
                      <Pressable style={styles.templateResetButton} onPress={handleResetReportTemplate}>
                        <Text style={styles.templateResetText}>恢复默认</Text>
                      </Pressable>
                    </View>
                    <TextInput
                      style={styles.templateInput}
                      value={reportTemplate}
                      onChangeText={setReportTemplate}
                      multiline
                      placeholder="输入报告模板..."
                      placeholderTextColor="#94a3b8"
                    />
                    <Text style={styles.templateHelp}>可用占位符：{'{报告标题}'} {'{报告类型}'} {'{起始日期}'} {'{结束日期}'} {'{项目范围}'} {'{记录数}'} {'{完成事项}'} {'{问题风险}'} {'{生活记录}'} {'{后续计划}'} {'{目标提醒}'} {'{灵感清单}'} {'{全部记录}'}</Text>
                  </View>
                  <View style={styles.reportSummaryPanel}>
                    <Text style={styles.reportSummaryTitle}>结构摘要</Text>
                    {reportSections.map((section) => (
                      <View key={section.title} style={styles.reportSection}>
                        <View style={[styles.reportSectionIcon, { backgroundColor: section.tint }]}>
                          <Glyph name={section.icon} size={18} color={section.color} />
                        </View>
                        <View style={styles.reportSectionBody}>
                          <Text style={styles.reportSectionTitle}>{section.title}</Text>
                          {section.items.map((item, index) => (
                            <Text key={`${section.title}-${index}`} style={styles.reportBullet}>{item}</Text>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        )}

        {activeTab === 'modules' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <MaterialBridgeCard
              summary={materialSummary}
              onOpenReport={() => openReportWorkspace({ kind: 'stage', range: 'month' })}
              onQuickRecord={openComposer}
            />
            <View style={styles.moduleSwitch}>
              {[
                ['goals', '目标'],
                ['ideas', '灵感'],
                ['wishes', '清单'],
              ].map(([key, label]) => (
                <Pressable key={key} style={[styles.moduleChip, activeModule === key && styles.activeModuleChip]} onPress={() => setActiveModule(key)}>
                  <Text style={[styles.moduleChipText, activeModule === key && styles.activeModuleChipText]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {activeModule === 'goals' && (
              <View>
                <TextInput
                  style={[styles.moduleInput, styles.wishInput]}
                  value={yearGoalInput}
                  multiline
                  onChangeText={setYearGoalInput}
                  placeholder="写一个年度目标，提醒自己长期要去哪里..."
                />
                <Pressable style={styles.wishPrimaryButton} onPress={() => handleAddGoal('year')}>
                  <Text style={styles.primaryButtonText}>添加年度目标</Text>
                </Pressable>
                <TextInput
                  style={[styles.moduleInput, styles.wishInput]}
                  value={stageGoalInput}
                  multiline
                  onChangeText={setStageGoalInput}
                  placeholder="写一个阶段性目标，提醒自己最近要推进什么..."
                />
                <Pressable style={styles.wishSecondaryButton} onPress={() => handleAddGoal('stage')}>
                  <Text style={styles.wishSecondaryButtonText}>添加阶段性目标</Text>
                </Pressable>
                <GoalBoard goals={goals} onToggle={handleToggleGoal} onDelete={handleDeleteGoal} onConvert={convertGoalToEntry} />
              </View>
            )}

            {activeModule === 'ideas' && (
              <View>
                <TextInput
                  style={[styles.moduleInput, styles.wishInput]}
                  value={moduleInput}
                  multiline
                  onChangeText={setModuleInput}
                  placeholder="写一个突然冒出来的灵感..."
                />
                <Pressable style={styles.primaryButton} onPress={handleAddModuleItem}>
                  <Text style={styles.primaryButtonText}>收集灵感</Text>
                </Pressable>
                <ModuleList title="灵感池" items={ideas} icon="bulb" onConvert={(item) => convertModuleItemToEntry('ideas', item)} />
              </View>
            )}

            {activeModule === 'wishes' && (
              <View>
                <TextInput
                  style={[styles.moduleInput, styles.wishInput]}
                  value={moduleInput}
                  multiline
                  onChangeText={setModuleInput}
                  placeholder="写一件以后想做的事情..."
                />
                <Pressable style={styles.primaryButton} onPress={handleAddModuleItem}>
                  <Text style={styles.primaryButtonText}>加入想做</Text>
                </Pressable>
                <ModuleList title="想做的事情" items={wishes} icon="sparkles" onConvert={(item) => convertModuleItemToEntry('wishes', item)} />
              </View>
            )}
          </ScrollView>
        )}

        {activeTab === 'settings' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionTitle}>云同步</Text>
            <View style={styles.settingsCard}>
              {authUser ? (
                <>
                  <Text style={styles.project}>{authUser.email}</Text>
                  <Text style={styles.bodyText}>WorkLog 默认本地可用。登录后，记录、目标、灵感和清单会同步到云端。当前状态：{syncStatus}</Text>
                  <Text style={styles.helpText}>上次同步：{lastSyncedAt ? formatSyncTime(lastSyncedAt) : '暂无'}</Text>
                  <View style={styles.actionRow}>
                    <Pressable style={styles.secondaryActionButton} onPress={() => hydrateCloudData(authToken)}>
                      <Text style={styles.secondaryActionText}>拉取云端</Text>
                    </Pressable>
                    <Pressable style={styles.primaryActionButton} onPress={() => pushCloudData(authToken)}>
                      <Text style={styles.primaryButtonText}>立即同步</Text>
                    </Pressable>
                  </View>
                  <Pressable style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>退出登录</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.project}>{authMode === 'register' ? '创建账号' : '登录账号'}</Text>
                  <Text style={styles.bodyText}>不登录也能本地使用。登录后可以把当前手机里的数据同步到云端，之后换设备也能继续使用。</Text>
                  <Text style={styles.helpText}>当前不支持密码找回，请妥善保存密码。</Text>
                  <Text style={styles.helpText}>上次同步：{lastSyncedAt ? formatSyncTime(lastSyncedAt) : '暂无'}</Text>
                  <View style={styles.moduleSwitch}>
                    <Pressable style={[styles.moduleChip, authMode === 'login' && styles.activeModuleChip]} onPress={() => setAuthMode('login')}>
                      <Text style={[styles.moduleChipText, authMode === 'login' && styles.activeModuleChipText]}>登录</Text>
                    </Pressable>
                    <Pressable style={[styles.moduleChip, authMode === 'register' && styles.activeModuleChip]} onPress={() => setAuthMode('register')}>
                      <Text style={[styles.moduleChipText, authMode === 'register' && styles.activeModuleChipText]}>注册</Text>
                    </Pressable>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={authEmail}
                    onChangeText={setAuthEmail}
                    placeholder="邮箱"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <TextInput
                    style={styles.input}
                    value={authPassword}
                    onChangeText={setAuthPassword}
                    placeholder="密码，至少 6 位"
                    autoCapitalize="none"
                    secureTextEntry
                  />
                  {authMode === 'register' && (
                    <PasswordStrength strength={authPasswordStrength} />
                  )}
                  <Pressable style={styles.primaryButton} onPress={handleAuthSubmit}>
                    <Text style={styles.primaryButtonText}>{authLoading ? '处理中...' : authMode === 'register' ? '注册并同步' : '登录并同步'}</Text>
                  </Pressable>
                  <Text style={styles.helpText}>{syncStatus}</Text>
                </>
              )}
            </View>
            <Text style={styles.sectionTitle}>数据边界</Text>
            <View style={styles.settingsCard}>
              <DataBoundaryRow title="只在本机" text="模型 API Key、浏览器本地缓存和未导出的临时状态。" />
              <DataBoundaryRow title="登录后同步" text="记录、项目归档状态、目标、灵感、清单、报告模板和模型服务商配置。" />
              <DataBoundaryRow title="不会上传" text="模型 API Key、导出的备份文件，以及 WorkLog 之外的本机数据。" />
            </View>
            <Text style={styles.sectionTitle}>本地配置</Text>
            <View style={styles.settingsCard}>
              <Text style={styles.project}>模型配置（可选）</Text>
              <Text style={styles.bodyText}>选择服务商后，通常只需要补模型名和 API Key。任意一项没填时，记录会直接按你的原文保存。</Text>
              <Text style={styles.helpText}>API Key 只保存在当前设备本地，不会上传到云端，也不会写入导出的备份文件。</Text>
              <View style={styles.providerGrid}>
                {modelProviders.map((provider) => (
                  <Pressable
                    key={provider.key}
                    style={[styles.providerCard, modelProvider === provider.key && styles.activeProviderCard]}
                    onPress={() => handleSelectModelProvider(provider.key)}
                  >
                    <Text style={[styles.providerName, modelProvider === provider.key && styles.activeProviderName]}>{provider.label}</Text>
                    <Text style={[styles.providerHint, modelProvider === provider.key && styles.activeProviderHint]}>{provider.hint}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={styles.input}
                value={modelName}
                onChangeText={setModelName}
                placeholder="模型名，例如 gpt-4.1-mini"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                value={modelApiKey}
                onChangeText={setModelApiKey}
                placeholder="sk-..."
                autoCapitalize="none"
                secureTextEntry
              />
              <Pressable style={styles.advancedToggle} onPress={() => setModelAdvancedOpen(!modelAdvancedOpen)}>
                <Text style={styles.advancedToggleText}>{modelAdvancedOpen || modelProvider === 'custom' ? '收起高级模型设置' : '高级模型设置'}</Text>
                <Text style={styles.advancedToggleIcon}>{modelAdvancedOpen || modelProvider === 'custom' ? '−' : '+'}</Text>
              </Pressable>
              {(modelAdvancedOpen || modelProvider === 'custom') && (
                <TextInput
                  style={styles.input}
                  value={modelEndpoint}
                  onChangeText={setModelEndpoint}
                  placeholder="接口地址，会随服务商自动填入"
                  autoCapitalize="none"
                />
              )}
              <Pressable style={styles.modelTestButton} onPress={handleTestModelConnection}>
                <Text style={styles.modelTestButtonText}>{modelTestLoading ? '正在测试...' : '测试连接'}</Text>
              </Pressable>
              {modelTestStatus ? <Text style={styles.helpText}>{modelTestStatus}</Text> : null}
            </View>
            <Text style={styles.sectionTitle}>数据迁移</Text>
            <View style={styles.settingsCard}>
              <Text style={styles.project}>导入 / 导出</Text>
              <Text style={styles.bodyText}>导出 JSON 可用于备份或迁移。备份包含记录、目标、灵感、清单、报告模板和模型地址配置，不包含 API Key。</Text>
              <View style={styles.actionRow}>
                <Pressable style={styles.secondaryActionButton} onPress={handleImportData}>
                  <Text style={styles.secondaryActionText}>导入 JSON</Text>
                </Pressable>
                <Pressable style={styles.primaryActionButton} onPress={handleExportData}>
                  <Text style={styles.primaryButtonText}>导出 JSON</Text>
                </Pressable>
              </View>
              {dataNotice ? <Text style={styles.helpText}>{dataNotice}</Text> : null}
            </View>
            <Text style={styles.sectionTitle}>当前版本</Text>
            <View style={styles.settingsCard}>
              <Text style={styles.project}>WorkLog v{appVersion}</Text>
              <Text style={styles.bodyText}>本机仍会保留一份本地缓存。登录后会自动同步到 Cloudflare D1；离线时可以先记录，恢复网络后再同步。</Text>
            </View>
          </ScrollView>
        )}
      </View>

      {composerOpen && (
        <ComposerSheet
          activeEntryType={activeEntryType}
          commonProjects={commonProjects}
          draft={draft}
          draftMode={draftMode}
          draftNotice={draftNotice}
          entryContent={entryContent}
          entryProject={entryProject}
          modelLoading={modelLoading}
          selectedDate={selectedDate}
          onChangeContent={setEntryContent}
          onChangeProject={setEntryProject}
          onClose={closeComposer}
          onConfirm={handleConfirmDraft}
          onCreate={handleCreateDraft}
          onResetDraft={() => setDraft(null)}
          onSelectType={setActiveEntryType}
        />
      )}

      {undoEntry && (
        <View style={styles.undoToast}>
          <Text style={styles.undoToastText}>已删除记录</Text>
          <Pressable style={styles.undoButton} onPress={handleUndoDelete}>
            <Text style={styles.undoButtonText}>撤销</Text>
          </Pressable>
        </View>
      )}

      {onboardingOpen && (
        <OnboardingOverlay
          selectedProfile={onboardingProfile}
          onSelectProfile={setOnboardingProfile}
          onStart={handleFinishOnboarding}
          onSkip={handleSkipOnboarding}
        />
      )}

      <View style={styles.tabbar}>
        {tabs.map((tab) => (
          <Pressable key={tab.key} style={[styles.tab, activeTab === tab.key && styles.activeTab]} onPress={() => setActiveTab(tab.key)}>
            <View style={[styles.tabIconBubble, activeTab === tab.key && styles.activeTabIconBubble]}>
              <Glyph name={tab.icon} size={19} color={activeTab === tab.key ? '#fff' : '#475569'} />
            </View>
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function Glyph({ name, size = 18, color = '#111827', style }) {
  const stroke = Math.max(2, size * 0.12);
  const thin = Math.max(1.5, size * 0.09);
  const lineBase = { position: 'absolute', backgroundColor: color, borderRadius: stroke };
  const borderBase = { position: 'absolute', borderColor: color, borderWidth: stroke };
  const wrapStyle = [styles.glyphBox, { width: size, height: size }, style];

  if ((name === 'sparkles-sharp' || name === 'sparkles') && Platform.OS === 'web') {
    return (
      <View style={wrapStyle}>
        {React.createElement(
          'svg',
          {
            width: size,
            height: size,
            viewBox: '0 0 512 512',
            style: { display: 'block', width: size, height: size },
            'aria-hidden': true,
            focusable: false,
          },
          sparklesSharpPaths.map((path, index) => React.createElement('path', { key: index, fill: color, d: path }))
        )}
      </View>
    );
  }

  const line = (key, left, top, width, height, rotate) => (
    <View
      key={key}
      style={[
        lineBase,
        { left, top, width, height },
        rotate ? { transform: [{ rotate }] } : null,
      ]}
    />
  );
  const outline = (key, left, top, width, height, radius = 4, extra = {}) => (
    <View key={key} style={[borderBase, { left, top, width, height, borderRadius: radius }, extra]} />
  );
  const dot = (key, left, top, dotSize = stroke * 1.35) => (
    <View key={key} style={[lineBase, { left, top, width: dotSize, height: dotSize, borderRadius: dotSize / 2 }]} />
  );
  const diamond = (key, left, top, diamondSize, radius = 0.1) => (
    <View
      key={key}
      style={[
        lineBase,
        {
          left,
          top,
          width: diamondSize,
          height: diamondSize,
          borderRadius: diamondSize * radius,
          transform: [{ rotate: '45deg' }],
        },
      ]}
    />
  );
  const fallback = (
    <Text allowFontScaling={false} style={[styles.glyph, { color, fontSize: size * 0.78, lineHeight: size }]}>
      {iconMarks[name] || String(name || '').slice(0, 1)}
    </Text>
  );

  const drawings = {
    add: [
      line('h', size * 0.2, size * 0.47, size * 0.6, stroke),
      line('v', size * 0.47, size * 0.2, stroke, size * 0.6),
    ],
    close: [
      line('a', size * 0.19, size * 0.48, size * 0.62, stroke, '45deg'),
      line('b', size * 0.19, size * 0.48, size * 0.62, stroke, '-45deg'),
    ],
    copy: [
      outline('back', size * 0.16, size * 0.12, size * 0.5, size * 0.56, size * 0.08),
      outline('front', size * 0.32, size * 0.3, size * 0.5, size * 0.56, size * 0.08),
    ],
    trash: [
      line('handle', size * 0.38, size * 0.12, size * 0.24, stroke),
      line('lid', size * 0.2, size * 0.24, size * 0.6, stroke),
      outline('bin', size * 0.27, size * 0.34, size * 0.46, size * 0.5, size * 0.06),
    ],
    checkmark: [
      line('short', size * 0.22, size * 0.52, size * 0.24, stroke, '45deg'),
      line('long', size * 0.39, size * 0.47, size * 0.44, stroke, '-45deg'),
    ],
    'calendar-sharp': [
      outline('box', size * 0.14, size * 0.18, size * 0.72, size * 0.68, size * 0.12),
      line('top', size * 0.15, size * 0.38, size * 0.7, thin),
      line('ring1', size * 0.32, size * 0.1, stroke, size * 0.2),
      line('ring2', size * 0.64, size * 0.1, stroke, size * 0.2),
      dot('d1', size * 0.32, size * 0.55, thin * 1.3),
      dot('d2', size * 0.52, size * 0.55, thin * 1.3),
    ],
    'folder-sharp': [
      <View key="tab" style={[borderBase, { left: size * 0.16, top: size * 0.2, width: size * 0.32, height: size * 0.2, borderBottomWidth: 0, borderTopLeftRadius: size * 0.08, borderTopRightRadius: size * 0.08 }]} />,
      outline('body', size * 0.12, size * 0.34, size * 0.76, size * 0.48, size * 0.1),
      line('top', size * 0.18, size * 0.34, size * 0.58, thin),
    ],
    'reader-sharp': [
      outline('doc', size * 0.2, size * 0.12, size * 0.6, size * 0.76, size * 0.09),
      line('l1', size * 0.34, size * 0.34, size * 0.32, thin),
      line('l2', size * 0.34, size * 0.49, size * 0.32, thin),
      line('l3', size * 0.34, size * 0.64, size * 0.24, thin),
    ],
    'sparkles-sharp': [
      diamond('main', size * 0.35, size * 0.24, size * 0.3, 0.08),
      diamond('top', size * 0.68, size * 0.14, size * 0.12, 0.18),
      diamond('bottom', size * 0.2, size * 0.68, size * 0.11, 0.18),
      line('ray1', size * 0.5, size * 0.09, thin, size * 0.12),
      line('ray2', size * 0.5, size * 0.72, thin, size * 0.12),
      line('ray3', size * 0.18, size * 0.45, size * 0.12, thin),
      line('ray4', size * 0.72, size * 0.45, size * 0.12, thin),
    ],
    sparkles: [
      diamond('main', size * 0.35, size * 0.24, size * 0.3, 0.08),
      diamond('top', size * 0.68, size * 0.14, size * 0.12, 0.18),
      diamond('bottom', size * 0.2, size * 0.68, size * 0.11, 0.18),
      line('ray1', size * 0.5, size * 0.09, thin, size * 0.12),
      line('ray2', size * 0.5, size * 0.72, thin, size * 0.12),
      line('ray3', size * 0.18, size * 0.45, size * 0.12, thin),
      line('ray4', size * 0.72, size * 0.45, size * 0.12, thin),
    ],
    'settings-sharp': [
      line('s1', size * 0.16, size * 0.28, size * 0.68, thin),
      line('s2', size * 0.16, size * 0.5, size * 0.68, thin),
      line('s3', size * 0.16, size * 0.72, size * 0.68, thin),
      dot('p1', size * 0.6, size * 0.22, size * 0.14),
      dot('p2', size * 0.28, size * 0.44, size * 0.14),
      dot('p3', size * 0.52, size * 0.66, size * 0.14),
    ],
    checkbox: [
      outline('square', size * 0.18, size * 0.18, size * 0.64, size * 0.64, size * 0.1),
      line('short', size * 0.32, size * 0.52, size * 0.18, stroke, '45deg'),
      line('long', size * 0.44, size * 0.48, size * 0.32, stroke, '-45deg'),
    ],
    'checkmark-circle': [
      outline('circle', size * 0.12, size * 0.12, size * 0.76, size * 0.76, size * 0.38),
      line('short', size * 0.3, size * 0.53, size * 0.18, stroke, '45deg'),
      line('long', size * 0.43, size * 0.49, size * 0.34, stroke, '-45deg'),
    ],
    time: [
      outline('circle', size * 0.13, size * 0.13, size * 0.74, size * 0.74, size * 0.37),
      line('hand1', size * 0.49, size * 0.28, thin, size * 0.26),
      line('hand2', size * 0.5, size * 0.5, size * 0.22, thin, '25deg'),
    ],
    'alert-circle': [
      outline('circle', size * 0.13, size * 0.13, size * 0.74, size * 0.74, size * 0.37),
      line('bang', size * 0.48, size * 0.29, stroke, size * 0.34),
      dot('bangdot', size * 0.46, size * 0.68, stroke * 1.15),
    ],
    'document-text': [
      outline('doc', size * 0.2, size * 0.12, size * 0.6, size * 0.76, size * 0.08),
      line('l1', size * 0.33, size * 0.36, size * 0.34, thin),
      line('l2', size * 0.33, size * 0.52, size * 0.34, thin),
      line('l3', size * 0.33, size * 0.68, size * 0.22, thin),
    ],
    heart: [
      <View key="lobe1" style={[lineBase, { left: size * 0.23, top: size * 0.22, width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17 }]} />,
      <View key="lobe2" style={[lineBase, { left: size * 0.43, top: size * 0.22, width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17 }]} />,
      <View key="base" style={[lineBase, { left: size * 0.31, top: size * 0.4, width: size * 0.38, height: size * 0.38, borderRadius: size * 0.04, transform: [{ rotate: '45deg' }] }]} />,
    ],
    'arrow-forward-circle': [
      outline('circle', size * 0.13, size * 0.13, size * 0.74, size * 0.74, size * 0.37),
      line('body', size * 0.31, size * 0.49, size * 0.34, stroke),
      line('up', size * 0.52, size * 0.4, size * 0.22, stroke, '45deg'),
      line('down', size * 0.52, size * 0.58, size * 0.22, stroke, '-45deg'),
    ],
    flag: [
      line('pole', size * 0.24, size * 0.16, stroke, size * 0.7),
      <View key="flag" style={[borderBase, { left: size * 0.32, top: size * 0.18, width: size * 0.44, height: size * 0.3, borderRadius: size * 0.05 }]} />,
    ],
    ribbon: [
      outline('medal', size * 0.3, size * 0.1, size * 0.4, size * 0.4, size * 0.2),
      line('r1', size * 0.34, size * 0.5, size * 0.13, size * 0.35, '12deg'),
      line('r2', size * 0.54, size * 0.5, size * 0.13, size * 0.35, '-12deg'),
    ],
  };

  return <View style={wrapStyle}>{drawings[name] || fallback}</View>;
}

function ComposerSheet({
  activeEntryType,
  commonProjects,
  draft,
  draftMode,
  draftNotice,
  entryContent,
  entryProject,
  modelLoading,
  selectedDate,
  onChangeContent,
  onChangeProject,
  onClose,
  onConfirm,
  onCreate,
  onResetDraft,
  onSelectType,
}) {
  const currentTemplate = entryTemplates[activeEntryType];

  return (
    <View style={styles.composerOverlay}>
      <Pressable style={styles.composerBackdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={8}
      >
      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.cardLabel}>记录到</Text>
            <Text style={styles.sheetTitle}>{formatFullDate(parseISODate(selectedDate))}</Text>
          </View>
          <Pressable style={styles.sheetCloseButton} onPress={onClose}>
            <Glyph name="close" size={18} color="#64748b" />
          </Pressable>
        </View>

        {!draft && (
          <>
            <View style={styles.tagRow}>
              {Object.entries(entryTemplates).map(([key, template]) => (
                <Pressable key={key} style={[styles.tag, activeEntryType === key && styles.activeTag]} onPress={() => onSelectType(key)}>
                  <Text style={[styles.tagText, activeEntryType === key && styles.activeTagText]}>{template.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={entryProject}
              onChangeText={onChangeProject}
              placeholder={`${currentTemplate.projectLabel}（可不填）`}
              placeholderTextColor="#94a3b8"
            />
            {commonProjects.length > 0 && (
              <View style={styles.commonProjectPanel}>
                <Text style={styles.fieldLabel}>常用项目</Text>
                <View style={styles.commonProjectRow}>
                  {commonProjects.map((project) => (
                    <Pressable key={project} style={styles.commonProjectChip} onPress={() => onChangeProject(project)}>
                      <Text style={styles.commonProjectText} numberOfLines={1}>{project}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            <Text style={styles.fieldLabel}>{currentTemplate.contentLabel}</Text>
            <TextInput
              style={styles.textarea}
              value={entryContent}
              multiline
              onChangeText={onChangeContent}
              placeholder={currentTemplate.placeholder}
              placeholderTextColor="#94a3b8"
            />
            <View style={styles.actionRow}>
              <Pressable style={styles.secondaryActionButton} onPress={() => onCreate('direct')}>
                <Text style={styles.secondaryActionText}>直接记录</Text>
              </Pressable>
              <Pressable style={styles.primaryActionButton} onPress={() => onCreate('ai')}>
                <Text style={styles.primaryButtonText}>{modelLoading ? '处理中...' : 'AI 润色'}</Text>
              </Pressable>
            </View>
          </>
        )}

        {draft && (
          <View style={styles.draftCard}>
            <Text style={styles.cardLabel}>{draftMode === 'ai' ? 'AI 修改版' : '记录预览'}</Text>
            <Text style={styles.project}>{draft.project}</Text>
            <Text style={styles.bodyText}>{draft.formalText}</Text>
            {draftNotice ? <Text style={styles.helpText}>{draftNotice}</Text> : null}
            <View style={styles.actionRow}>
              <Pressable style={styles.secondaryActionButton} onPress={onResetDraft}>
                <Text style={styles.secondaryActionText}>重新编辑</Text>
              </Pressable>
              <Pressable style={styles.primaryActionButton} onPress={onConfirm}>
                <Text style={styles.primaryButtonText}>确认入库</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function EntryCard({ entry, highlighted, onDelete, onSave }) {
  const type = entryTypes[entry.type] || entryTypes.note;
  const translateX = useRef(new Animated.Value(0)).current;
  const [isEditing, setIsEditing] = useState(false);
  const [project, setProject] = useState(entry.project);
  const [formalText, setFormalText] = useState(entry.formalText);

  const swipePanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => {
      return Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2;
    },
    onPanResponderMove: (_, gesture) => {
      const nextX = Math.max(-88, Math.min(0, gesture.dx));
      translateX.setValue(nextX);
    },
    onPanResponderRelease: (_, gesture) => {
      Animated.spring(translateX, {
        toValue: gesture.dx < -42 ? -88 : 0,
        useNativeDriver: true,
      }).start();
    },
  }), [translateX]);

  function closeSwipe() {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }

  function handleEdit() {
    closeSwipe();
    setProject(entry.project);
    setFormalText(entry.formalText);
    setIsEditing(true);
  }

  function handleSave() {
    const nextProject = project.trim() || formalText.trim() || entry.project;
    const nextText = formalText.trim() || entry.formalText;
    onSave(entry.id, {
      project: nextProject,
      formalText: nextText,
      rawText: `#${entry.type} ${nextProject} ${nextText}`.trim(),
    });
    setIsEditing(false);
  }

  function handleDelete() {
    closeSwipe();
    onDelete(entry.id);
  }

  return (
    <View style={styles.swipeShell}>
      <Pressable style={styles.swipeDelete} onPress={handleDelete}>
        <Glyph name="trash" size={18} color="#fff" />
        <Text style={styles.swipeDeleteText}>删除</Text>
      </Pressable>
      <Animated.View
        style={[styles.entryCard, highlighted && styles.highlightedEntryCard, { transform: [{ translateX }] }]}
        {...(!isEditing ? swipePanResponder.panHandlers : {})}
      >
        <View style={[styles.typeBadge, { backgroundColor: `${type.color}16` }]}>
          <Glyph name={type.icon} size={18} color={type.color} />
          <Text style={[styles.typeText, { color: type.color }]}>{type.label}</Text>
        </View>
        <View style={styles.entryBody}>
          {isEditing ? (
            <View style={styles.entryEditPanel}>
              <TextInput
                style={styles.entryEditInput}
                value={project}
                onChangeText={setProject}
                placeholder="项目名"
              />
              <TextInput
                style={[styles.entryEditInput, styles.entryEditTextarea]}
                value={formalText}
                multiline
                onChangeText={setFormalText}
                placeholder="记录内容"
              />
              <View style={styles.entryEditActions}>
                <Pressable style={styles.entryEditGhostButton} onPress={() => setIsEditing(false)}>
                  <Text style={styles.entryEditGhostText}>取消</Text>
                </Pressable>
                <Pressable style={styles.entryEditSaveButton} onPress={handleSave}>
                  <Text style={styles.entryEditSaveText}>保存</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onLongPress={handleEdit} delayLongPress={360}>
              <Text style={[styles.project, styles.entryProject]}>{entry.project}</Text>
              <Text style={styles.bodyText}>{entry.formalText}</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

function ReviewPrompt({ entries, projects, materialSummary, review, loading, onOpenMaterials, onOpenReport, onOpenReview }) {
  const riskCount = entries.filter((entry) => entry.type === 'risk').length;
  const activeProjects = projects.filter((project) => !project.archived).length;

  return (
    <View style={styles.reviewPrompt}>
      <View style={styles.reviewPromptHeader}>
        <View>
          <Text style={styles.cardLabel}>本周复盘</Text>
          <Text style={styles.reviewPromptTitle}>{entries.length ? '已经有材料了' : '先从一条记录开始'}</Text>
        </View>
        <View style={styles.reviewPromptActions}>
          <Pressable style={styles.reviewGhostButton} onPress={onOpenReview}>
            <Text style={styles.reviewGhostButtonText}>{loading ? '点评中...' : 'AI点评'}</Text>
          </Pressable>
          <Pressable style={styles.reviewPromptButton} onPress={onOpenReport}>
            <Text style={styles.reviewPromptButtonText}>生成周报</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.reviewStatsRow}>
        <ProjectStat value={entries.length} label="本周记录" />
        <ProjectStat value={activeProjects} label="项目" />
        <ProjectStat value={riskCount} label="风险" />
      </View>
      {review && (
        <View style={styles.weeklyReviewBox}>
          <Text style={styles.weeklyReviewTitle}>{review.summary}</Text>
          {review.actions.slice(0, 2).map((item, index) => (
            <Text key={`${review.generatedAt}-action-${index}`} style={styles.weeklyReviewLine}>- {item}</Text>
          ))}
        </View>
      )}
      <Pressable style={styles.reviewMaterialLine} onPress={onOpenMaterials}>
        <Text style={styles.reviewMaterialText}>{materialSummary.label}</Text>
        <Text style={styles.reviewMaterialAction}>整理材料</Text>
      </Pressable>
    </View>
  );
}

function ReviewInsightCard({ eyebrow, title, review, loading, emptyText, notice, embedded, onGenerate }) {
  const hasReview = Boolean(review);

  return (
    <View style={embedded ? styles.reviewInsightPanel : styles.reviewInsightCard}>
      <View style={styles.reviewInsightHeader}>
        <View style={styles.reviewInsightTitleWrap}>
          <Text style={styles.cardLabel}>{eyebrow}</Text>
          <Text style={styles.reviewInsightTitle}>{title}</Text>
        </View>
        <Pressable style={styles.reviewGenerateButton} onPress={onGenerate}>
          <Text style={styles.reviewGenerateText}>{loading ? '点评中...' : hasReview ? '重新点评' : '生成点评'}</Text>
        </Pressable>
      </View>
      {hasReview ? (
        <>
          <View style={styles.reviewMetaRow}>
            <Text style={styles.reviewSourceBadge}>{review.source === 'ai' ? 'AI 生成' : '本地规则'}</Text>
            <Text style={styles.reviewTimeText}>{formatSyncTime(review.generatedAt)}</Text>
          </View>
          <Text style={styles.reviewSummary}>{review.summary}</Text>
          <ReviewList title="做得好的地方" items={review.highlights} />
          <ReviewList title="需要补齐" items={review.gaps} />
          <ReviewList title="下一步建议" items={review.actions} />
          <ReviewList title="职业素材提醒" items={review.careerTips} />
        </>
      ) : (
        <Text style={styles.reviewEmptyText}>{emptyText}</Text>
      )}
      {notice ? <Text style={styles.reviewNotice}>{notice}</Text> : null}
    </View>
  );
}

function ReviewList({ title, items = [] }) {
  if (!items.length) return null;

  return (
    <View style={styles.reviewList}>
      <Text style={styles.reviewListTitle}>{title}</Text>
      {items.slice(0, 4).map((item, index) => (
        <Text key={`${title}-${index}`} style={styles.reviewListItem}>- {item}</Text>
      ))}
    </View>
  );
}

function MaterialSummaryInline({ summary }) {
  return (
    <View style={styles.materialInline}>
      <Text style={styles.materialInlineText}>{summary.label}</Text>
    </View>
  );
}

function MaterialBridgeCard({ summary, onOpenReport, onQuickRecord }) {
  return (
    <View style={styles.materialBridgeCard}>
      <View style={styles.materialBridgeHeader}>
        <View>
          <Text style={styles.cardLabel}>报告材料</Text>
          <Text style={styles.materialBridgeTitle}>{summary.hasMaterials ? '这些内容可以进报告' : '先存一点目标、灵感或清单'}</Text>
        </View>
        <View style={styles.materialBridgeCount}>
          <Text style={styles.materialBridgeCountText}>{summary.total}</Text>
        </View>
      </View>
      <View style={styles.materialBridgeStats}>
        <ProjectStat value={summary.openGoals} label="目标" />
        <ProjectStat value={summary.ideas} label="灵感" />
        <ProjectStat value={summary.wishes} label="清单" />
      </View>
      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryActionButton} onPress={onQuickRecord}>
          <Text style={styles.secondaryActionText}>写记录</Text>
        </Pressable>
        <Pressable style={styles.primaryActionButton} onPress={onOpenReport}>
          <Text style={styles.primaryButtonText}>生成阶段总结</Text>
        </Pressable>
      </View>
    </View>
  );
}

function OnboardingOverlay({ selectedProfile, onSelectProfile, onStart, onSkip }) {
  const profile = onboardingProfiles.find((item) => item.key === selectedProfile) || onboardingProfiles[0];

  return (
    <View style={styles.onboardingOverlay}>
      <View style={styles.onboardingBackdrop} />
      <View style={styles.onboardingCard}>
        <Text style={styles.onboardingEyebrow}>WorkLog</Text>
        <Text style={styles.onboardingTitle}>轻轻记一下，月底不用翻聊天记录。</Text>
        <Text style={styles.onboardingBody}>每天写一句碎片，WorkLog 会把它沉淀成项目进展、待跟进、风险和可复制的周期报告。</Text>
        <View style={styles.onboardingProfiles}>
          {onboardingProfiles.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.onboardingProfile, selectedProfile === item.key && styles.activeOnboardingProfile]}
              onPress={() => onSelectProfile(item.key)}
            >
              <Text style={[styles.onboardingProfileTitle, selectedProfile === item.key && styles.activeOnboardingProfileTitle]}>{item.label}</Text>
              <Text style={[styles.onboardingProfileText, selectedProfile === item.key && styles.activeOnboardingProfileText]} numberOfLines={2}>{item.content}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.onboardingPreview}>
          <Text style={styles.cardLabel}>第一条记录示例</Text>
          <Text style={styles.project}>{profile.project}</Text>
          <Text style={styles.bodyText}>{profile.content}</Text>
        </View>
        <View style={styles.actionRow}>
          <Pressable style={styles.secondaryActionButton} onPress={onSkip}>
            <Text style={styles.secondaryActionText}>稍后再说</Text>
          </Pressable>
          <Pressable style={styles.primaryActionButton} onPress={() => onStart(selectedProfile)}>
            <Text style={styles.primaryButtonText}>写第一条</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ProjectDashboard({ projects, selectedKey, onArchive, onRename, onSelect, onRecord, onReport, projectReviews, reviewLoadingKey, onReview }) {
  const [projectQuery, setProjectQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const selected = projects.find((project) => project.key === selectedKey) || projects[0];
  const filteredProjects = useMemo(() => filterProjectSummaries(projects, projectQuery, projectFilter), [projects, projectQuery, projectFilter]);
  const visibleProjects = filteredProjects.slice(0, 12);
  const [projectNameDraft, setProjectNameDraft] = useState(selected?.label || '');

  useEffect(() => {
    setProjectNameDraft(selected?.label || '');
  }, [selected?.key, selected?.label]);

  if (!projects.length || !selected) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.emptyProjectCard}>
          <Text style={styles.projectDashboardTitle}>先写一条记录</Text>
          <Text style={styles.bodyText}>项目会从你的记录里自动生成。写项目名之后，这里会展示进展、风险、待跟进和关联目标。</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.projectHero}>
        <View style={styles.projectHeroTop}>
          <View>
            <Text style={styles.cardLabel}>项目驾驶舱</Text>
            <Text style={styles.projectDashboardTitle}>{selected.label}</Text>
          </View>
          <View style={[styles.projectStatusBadge, { backgroundColor: selected.status.tint }]}>
            <Text style={[styles.projectStatusText, { color: selected.status.color }]}>{selected.status.label}</Text>
          </View>
        </View>
        <View style={styles.projectStatsRow}>
          <ProjectStat value={selected.total} label="记录" />
          <ProjectStat value={selected.workCount} label="完成" />
          <ProjectStat value={selected.todoCount} label="待跟进" />
          <ProjectStat value={selected.riskCount} label="风险" />
        </View>
      </View>

      <View style={styles.projectActionRow}>
        <Pressable style={styles.projectPrimaryAction} onPress={() => onRecord(selected.label, 'work')}>
          <Text style={styles.primaryButtonText}>记录进展</Text>
        </Pressable>
        <Pressable style={styles.projectSecondaryAction} onPress={() => onReport(selected.key)}>
          <Text style={styles.secondaryActionText}>生成报告</Text>
        </Pressable>
      </View>

      <ReviewInsightCard
        eyebrow="Project Review"
        title="项目点评"
        review={projectReviews?.[selected.key]}
        loading={reviewLoadingKey === `projects:${selected.key}`}
        emptyText="点评会检查项目推进、风险闭环、待办密度和是否值得沉淀为职业素材。"
        onGenerate={() => onReview(selected)}
      />

      <View style={styles.projectManageCard}>
        <View style={styles.projectManageHeader}>
          <View>
            <Text style={styles.reportSummaryTitle}>项目管理</Text>
            <Text style={styles.projectIndexMeta}>重命名会同步更新已有记录；归档不会删除任何内容。</Text>
          </View>
          <Pressable
            style={[styles.archiveButton, selected.archived && styles.restoreButton]}
            onPress={() => onArchive(selected.key, !selected.archived)}
          >
            <Text style={[styles.archiveButtonText, selected.archived && styles.restoreButtonText]}>{selected.archived ? '恢复' : '归档'}</Text>
          </Pressable>
        </View>
        <View style={styles.projectRenameRow}>
          <TextInput
            style={styles.projectRenameInput}
            value={projectNameDraft}
            onChangeText={setProjectNameDraft}
            placeholder="项目名称"
            placeholderTextColor="#94a3b8"
          />
          <Pressable style={styles.projectRenameButton} onPress={() => onRename(selected.key, projectNameDraft)}>
            <Text style={styles.projectRenameButtonText}>重命名</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.projectIndexCard}>
        <View style={styles.projectIndexHeader}>
          <View>
            <Text style={styles.reportSummaryTitle}>项目索引</Text>
            <Text style={styles.projectIndexMeta}>共 {projects.length} 个项目，当前显示 {filteredProjects.length} 个</Text>
          </View>
          <View style={styles.projectIndexCount}>
            <Text style={styles.projectIndexCountText}>{projects.length}</Text>
          </View>
        </View>
        <TextInput
          style={styles.projectSearchInput}
          value={projectQuery}
          onChangeText={setProjectQuery}
          placeholder="搜索项目、记录内容或日期..."
          placeholderTextColor="#94a3b8"
        />
        <View style={styles.projectFilterRow}>
          {projectFilterOptions.map((option) => (
            <Pressable
              key={option.key}
              style={[styles.projectFilterChip, projectFilter === option.key && styles.activeProjectFilterChip]}
              onPress={() => setProjectFilter(option.key)}
            >
              <Text style={[styles.projectFilterText, projectFilter === option.key && styles.activeProjectFilterText]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        {filteredProjects.length === 0 ? (
          <Text style={styles.emptyPanel}>没有匹配项目，换个关键词试试。</Text>
        ) : (
          <View style={styles.projectList}>
            {visibleProjects.map((project) => (
              <Pressable
                key={project.key}
                style={[styles.projectListItem, selected.key === project.key && styles.activeProjectListItem]}
                onPress={() => onSelect(project.key)}
              >
                <View style={styles.projectListMain}>
                  <Text style={[styles.projectListTitle, selected.key === project.key && styles.activeProjectListTitle]} numberOfLines={1}>{project.label}</Text>
                  <Text style={[styles.projectListMeta, selected.key === project.key && styles.activeProjectListMeta]}>{project.total} 条 · 最近 {project.lastDate || '暂无日期'}</Text>
                </View>
                <View style={[styles.projectListStatus, { backgroundColor: selected.key === project.key ? 'rgba(255,255,255,0.14)' : project.status.tint }]}>
                  <Text style={[styles.projectListStatusText, { color: selected.key === project.key ? '#fff' : project.status.color }]}>{project.status.label}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
        {filteredProjects.length > visibleProjects.length && (
          <Text style={styles.projectListHint}>还有 {filteredProjects.length - visibleProjects.length} 个项目未显示，继续输入关键词可以更快定位。</Text>
        )}
      </View>

      <View style={styles.projectFocusCard}>
        <Text style={styles.reportSummaryTitle}>最近推进</Text>
        <ProjectEntryList entries={selected.entries.slice(0, 4)} emptyText="还没有最近推进。" />
      </View>

      <View style={styles.projectSplitRow}>
        <View style={styles.projectSplitCard}>
          <Text style={styles.reportSummaryTitle}>待跟进</Text>
          <ProjectEntryList entries={selected.todoEntries.slice(0, 3)} emptyText="暂无待跟进。" compact />
        </View>
        <View style={styles.projectSplitCard}>
          <Text style={styles.reportSummaryTitle}>风险</Text>
          <ProjectEntryList entries={selected.riskEntries.slice(0, 3)} emptyText="暂无风险。" compact />
        </View>
      </View>

      <View style={styles.projectFocusCard}>
        <Text style={styles.reportSummaryTitle}>关联目标</Text>
        {selected.relatedGoals.length === 0 ? (
          <Text style={styles.emptyPanel}>还没有匹配到同名目标。目标或记录里出现相同项目名后，会自动聚合到这里。</Text>
        ) : (
          selected.relatedGoals.map((goal) => (
            <View key={`${goal.period}-${goal.id}`} style={styles.projectGoalItem}>
              <Text style={styles.projectGoalPeriod}>{goal.period === 'year' ? '年度' : '阶段'}</Text>
              <Text style={styles.projectGoalText}>{goal.text}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function ProjectStat({ value, label }) {
  return (
    <View style={styles.projectStat}>
      <Text style={styles.projectStatValue}>{value}</Text>
      <Text style={styles.projectStatLabel}>{label}</Text>
    </View>
  );
}

function ProjectEntryList({ entries, emptyText, compact }) {
  if (!entries.length) return <Text style={styles.emptyPanel}>{emptyText}</Text>;

  return (
    <View style={styles.projectEntryList}>
      {entries.map((entry) => {
        const type = entryTypes[entry.type] || entryTypes.note;
        return (
          <View key={entry.id} style={[styles.projectTimelineItem, compact && styles.compactProjectTimelineItem]}>
            <View style={[styles.projectTimelineDot, { backgroundColor: type.color }]} />
            <View style={styles.projectTimelineBody}>
              <Text style={styles.projectTimelineMeta}>{entry.date} · {type.label}</Text>
              <Text style={styles.projectTimelineText}>{entry.formalText}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ModuleList({ title, items, icon, onConvert }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length === 0 && (
        <Text style={styles.emptyPanel}>还没有内容，写下第一条就会出现在这里。</Text>
      )}
      {items.map((item, index) => (
        <View key={`${item}-${index}`} style={styles.moduleCard}>
          <View style={styles.moduleIcon}>
            <Glyph name={icon} size={18} color="#111827" />
          </View>
          <Text style={styles.moduleText}>{item}</Text>
          {onConvert && (
            <Pressable style={styles.convertButton} onPress={() => onConvert(item)}>
              <Text style={styles.convertButtonText}>转记录</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

function DataBoundaryRow({ title, text }) {
  return (
    <View style={styles.dataBoundaryRow}>
      <Text style={styles.dataBoundaryTitle}>{title}</Text>
      <Text style={styles.dataBoundaryText}>{text}</Text>
    </View>
  );
}

function PasswordStrength({ strength }) {
  if (!strength.value) return null;

  return (
    <View style={styles.passwordStrength}>
      <View style={styles.passwordTrack}>
        <View style={[styles.passwordFill, { width: `${strength.percent}%`, backgroundColor: strength.color }]} />
      </View>
      <Text style={[styles.passwordStrengthText, { color: strength.color }]}>{strength.label}</Text>
    </View>
  );
}

function GoalBoard({ goals, onToggle, onDelete, onConvert }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>目标提醒</Text>
      <GoalSection
        period="year"
        title="年度目标"
        icon="flag"
        iconColor="#111827"
        markStyle={styles.yearGoalMark}
        panelStyle={styles.yearGoalPanel}
        emptyText="还没有年度目标。"
        items={goals.year}
        onToggle={onToggle}
        onDelete={onDelete}
        onConvert={onConvert}
      />
      <GoalSection
        period="stage"
        title="阶段性目标"
        icon="ribbon"
        iconColor="#64748b"
        markStyle={styles.stageGoalMark}
        panelStyle={styles.stageGoalPanel}
        emptyText="还没有阶段性目标。"
        items={goals.stage}
        onToggle={onToggle}
        onDelete={onDelete}
        onConvert={onConvert}
      />
    </View>
  );
}

function GoalSection({ period, title, icon, iconColor, markStyle, panelStyle, emptyText, items, onToggle, onDelete, onConvert }) {
  const orderedItems = [...items].sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <View style={[styles.goalPanel, panelStyle]}>
      <View style={styles.goalHeader}>
        <View style={[styles.goalMark, markStyle]} />
        <Glyph name={icon} size={18} color={iconColor} />
        <Text style={styles.goalTitle}>{title}</Text>
      </View>
      {items.length === 0 && (
        <Text style={styles.emptyPanel}>{emptyText}</Text>
      )}
      {orderedItems.map((item) => (
        <View key={item.id} style={[styles.goalItem, item.done && styles.doneGoalItem]}>
          <Pressable
            accessibilityLabel={item.done ? `取消完成${title}` : `完成${title}`}
            style={[styles.goalStatus, item.done && styles.doneGoalStatus]}
            onPress={() => onToggle(period, item.id)}
          >
            {item.done && <Glyph name="checkmark" size={12} color="#fff" />}
            <Text style={[styles.goalStatusText, item.done && styles.doneGoalStatusText]}>{item.done ? '完成' : '进行中'}</Text>
          </Pressable>
          <Text style={[styles.goalText, item.done && styles.doneGoalText]}>{item.text}</Text>
          <Pressable accessibilityLabel={`转为记录${title}`} style={styles.goalConvert} onPress={() => onConvert(period, item)}>
            <Text style={styles.goalConvertText}>记录</Text>
          </Pressable>
          <Pressable accessibilityLabel={`删除${title}`} style={styles.goalDelete} onPress={() => onDelete(period, item.id)}>
            <Glyph name="trash" size={16} color="#64748b" />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function createGoal(text) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    done: false,
  };
}

function sanitizePortableData(data = {}) {
  return {
    entries: Array.isArray(data.entries) ? data.entries : [],
    goals: data.goals && typeof data.goals === 'object' ? {
      stage: Array.isArray(data.goals.stage) ? data.goals.stage : [],
      year: Array.isArray(data.goals.year) ? data.goals.year : [],
    } : { stage: [], year: [] },
    ideas: Array.isArray(data.ideas) ? data.ideas : [],
    wishes: Array.isArray(data.wishes) ? data.wishes : [],
    projectMeta: data.projectMeta && typeof data.projectMeta === 'object' ? data.projectMeta : {},
    reviews: sanitizeReviews(data.reviews),
    reportKind: typeof data.reportKind === 'string' ? data.reportKind : 'weekly',
    reportMaterials: data.reportMaterials && typeof data.reportMaterials === 'object' ? {
      ...defaultReportMaterials,
      ...data.reportMaterials,
    } : defaultReportMaterials,
    reportTemplate: typeof data.reportTemplate === 'string' ? data.reportTemplate : defaultReportTemplate,
    modelConfig: data.modelConfig && typeof data.modelConfig === 'object' ? {
      provider: String(data.modelConfig.provider || inferModelProvider(data.modelConfig.endpoint)),
      endpoint: String(data.modelConfig.endpoint || ''),
      model: String(data.modelConfig.model || ''),
    } : {},
  };
}

function createEmptyReviews() {
  return {
    daily: {},
    weekly: {},
    report: {},
    projects: {},
  };
}

function sanitizeReviews(value = {}) {
  const safe = createEmptyReviews();
  ['daily', 'weekly', 'report', 'projects'].forEach((scope) => {
    if (!value[scope] || typeof value[scope] !== 'object') return;
    Object.entries(value[scope]).forEach(([key, review]) => {
      safe[scope][key] = normalizeReview(review);
    });
  });
  return safe;
}

function normalizeReview(review = {}) {
  return {
    id: String(review.id || ''),
    title: String(review.title || 'AI 点评'),
    scope: String(review.scope || ''),
    source: review.source === 'ai' ? 'ai' : 'local',
    generatedAt: String(review.generatedAt || new Date().toISOString()),
    summary: String(review.summary || '暂无点评摘要。'),
    highlights: normalizeStringList(review.highlights),
    gaps: normalizeStringList(review.gaps),
    actions: normalizeStringList(review.actions),
    careerTips: normalizeStringList(review.careerTips),
  };
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 6);
}

function getReviewKey(scope, range = {}, project = 'all', entries = []) {
  const ids = entries.map((entry) => entry.id).join(',');
  return [scope, range.start || '', range.end || '', project || 'all', simpleHash(ids)].join(':');
}

function simpleHash(value) {
  const text = String(value || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

async function reviewWithModel({ endpoint, model, apiKey, context }) {
  const response = await fetch(endpoint.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: model.trim(),
      temperature: 0.25,
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content: '你是 WorkLog 的 AI 工作复盘教练。只返回 JSON，不要 Markdown。不要编造数据；如果记录里没有指标，要指出缺少证据。',
        },
        {
          role: 'user',
          content: buildReviewPrompt(context),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('review request failed');
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '';
  const jsonText = content.match(/\{[\s\S]*\}/)?.[0] || content;
  const parsed = JSON.parse(jsonText);

  return normalizeReview({
    summary: parsed.summary,
    highlights: parsed.highlights,
    gaps: parsed.gaps,
    actions: parsed.actions,
    careerTips: parsed.careerTips,
    source: 'ai',
  });
}

function buildReviewPrompt(context = {}) {
  const entries = Array.isArray(context.entries) ? context.entries : [];
  const lines = entries.slice(0, 40).map(formatReportEntryLine).join('\n') || '- 暂无记录';
  const goals = formatGoalMaterials(context.goals);
  const ideas = formatIdeaWishMaterials(context.ideas, context.wishes);
  const project = context.project ? [
    `项目记录数：${context.project.total}`,
    `完成数：${context.project.workCount}`,
    `待跟进数：${context.project.todoCount}`,
    `风险数：${context.project.riskCount}`,
  ].join('\n') : '';

  return `请点评下面这组 WorkLog 材料，返回 JSON：
{
  "summary": "一句话总结",
  "highlights": ["做得好的地方，1-3条"],
  "gaps": ["缺口/风险/证据不足，1-3条"],
  "actions": ["下一步建议，2-4条"],
  "careerTips": ["能否转成简历/作品集素材以及缺什么证据，1-3条"]
}

点评范围：${context.title || 'WorkLog 点评'}
时间：${context.range?.start || '未设置'} - ${context.range?.end || '未设置'}
项目：${context.projectLabel || '全部'}
${project}

记录：
${lines}

目标：
${goals}

灵感与清单：
${ideas}

要求：
1. 用中文，短句，具体。
2. 不要编造上线效果、转化率、曝光量等记录里没有的数据。
3. 如果缺少结果证据，请明确指出。
4. 输出必须是合法 JSON。`;
}

function buildLocalReview(context = {}) {
  const entries = Array.isArray(context.entries) ? context.entries : [];
  const work = entries.filter((entry) => entry.type === 'work');
  const todo = entries.filter((entry) => entry.type === 'todo');
  const risk = entries.filter((entry) => entry.type === 'risk');
  const life = entries.filter((entry) => entry.type === 'life');
  const projectCount = new Set(entries.map((entry) => normalizeProjectKey(entry.project)).filter(Boolean)).size;
  const hasEvidence = entries.some((entry) => hasResultEvidence(`${entry.project} ${entry.formalText} ${entry.rawText}`));
  const projectText = context.projectLabel && !/全部|当日/.test(context.projectLabel) ? `${context.projectLabel} ` : '';

  if (!entries.length) {
    return normalizeReview({
      summary: `${context.title || '当前范围'}还没有记录，先补一条最小事实会更容易复盘。`,
      highlights: ['已经留出了复盘入口，适合先从一条记录开始。'],
      gaps: ['缺少可点评的原始记录，无法判断推进质量。'],
      actions: ['补一条完成事项或待跟进事项。', '如果今天没有工作记录，也可以记录生活、学习或一个想法。'],
      careerTips: ['职业素材需要项目、动作和结果证据，当前还不能沉淀。'],
    });
  }

  const summary = `${projectText}共 ${entries.length} 条记录，包含 ${work.length} 条完成、${todo.length} 条待跟进、${risk.length} 条风险，覆盖 ${projectCount || 1} 个项目。`;
  const highlights = [];
  const gaps = [];
  const actions = [];
  const careerTips = [];

  if (work.length) highlights.push(`已有 ${work.length} 条完成事项，说明这段时间不是单纯待办堆积。`);
  if (projectCount > 1) highlights.push(`记录覆盖 ${projectCount} 个项目，适合做横向复盘。`);
  if (life.length) highlights.push('生活记录也被纳入，后续能看到工作节奏和个人状态的关系。');
  if (!highlights.length) highlights.push('已经把碎片写进系统，比留在聊天记录里更容易追踪。');

  if (risk.length) gaps.push(`存在 ${risk.length} 条风险，需要明确负责人、影响范围和下一步处理时间。`);
  if (todo.length > work.length) gaps.push('待跟进数量高于完成事项，建议检查是否有事项长期未闭环。');
  if (!hasEvidence) gaps.push('当前记录缺少数字、结果或用户反馈，后续不太容易转成强简历素材。');
  if (!risk.length && todo.length === 0) gaps.push('风险和待办都较少，可能是记录偏结果，缺少过程中的阻塞和下一步。');

  if (todo.length) actions.push(`优先处理 ${todo[0].project}：${todo[0].formalText}`);
  if (risk.length) actions.push(`先把 ${risk[0].project} 的风险拆成影响、责任人和预计解决时间。`);
  if (!hasEvidence) actions.push('给关键完成事项补一条数据证据，例如曝光、转化、数量、反馈或验收结论。');
  actions.push('下次记录时尽量写清“我做了什么、影响了什么、下一步是什么”。');

  if (work.length && hasEvidence) {
    careerTips.push('已有结果证据，可以尝试沉淀为简历 bullet 或项目作品集片段。');
  } else if (work.length) {
    careerTips.push('完成事项可以作为职业素材候选，但还需要补充指标、范围或业务影响。');
  } else {
    careerTips.push('当前更像计划和风险跟踪，暂不适合直接写进简历。');
  }
  if (projectCount === 1 && entries[0]?.project) careerTips.push(`如果 ${entries[0].project} 是长期项目，可以补充背景、目标和最终结果。`);

  return normalizeReview({
    summary,
    highlights,
    gaps,
    actions,
    careerTips,
  });
}

function hasResultEvidence(text) {
  return /(\d+(\.\d+)?%|\d+\s*(个|条|次|人|天|周|月|小时|h|H)|上线|发布|验收|转化|点击|曝光|留存|收入|成本|效率|反馈|数据|指标|AB|A\/B)/i.test(String(text || ''));
}

async function polishWithModel({ endpoint, model, apiKey, rawText, fallback }) {
  const fixedTypeLabel = entryTypes[fallback.type]?.label || fallback.type;
  const response = await fetch(endpoint.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: model.trim(),
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: '你是 WorkLog 的工作记录整理助手。只返回 JSON，不要 Markdown。',
        },
        {
          role: 'user',
          content: [
            '把这条记录的“具体内容”润色成适合工作记录/报告沉淀的表达。',
            '只返回 JSON，不要 Markdown。',
            `记录类型固定为：${fallback.type}（${fixedTypeLabel}），不要改。`,
            `项目名固定为：${fallback.project || '未归类'}，不要改、不要扩写、不要替换同义词。`,
            '只优化 formalText 字段；formalText 不要重复写项目名作为开头。',
            '返回字段：formalText。',
            `原始记录：${rawText}`,
            `当前内容：${fallback.formalText}`,
          ].join('\n'),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('model request failed');
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '';
  const jsonText = content.match(/\{[\s\S]*\}/)?.[0] || content;
  const parsed = JSON.parse(jsonText);

  return {
    type: fallback.type,
    project: fallback.project,
    formalText: cleanPolishedText(parsed.formalText, fallback),
  };
}

function cleanPolishedText(text, fallback) {
  const fallbackText = String(fallback.formalText || '').trim();
  let value = String(text || '').trim() || fallbackText;
  const project = String(fallback.project || '').trim();

  if (!project) return value;

  const escapedProject = escapeRegExp(project);
  value = value
    .replace(new RegExp(`^(${escapedProject})([\\s:：,，。.-]+)\\1([\\s:：,，。.-]+)?`, 'i'), '')
    .replace(new RegExp(`^(${escapedProject})([\\s:：,，。.-]+)`, 'i'), '')
    .trim();

  return value || fallbackText;
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function testModelConnection({ endpoint, model, apiKey }) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 15000) : null;

  try {
    const response = await fetch(endpoint.trim(), {
      method: 'POST',
      signal: controller?.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: model.trim(),
        temperature: 0,
        max_tokens: 8,
        messages: [
          { role: 'system', content: '只回复 OK。' },
          { role: 'user', content: '测试连接' },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error('连接失败：API Key 无效或没有权限');
      if (response.status === 404) throw new Error('连接失败：接口地址或模型名不正确');
      throw new Error(`连接失败：服务商返回 ${response.status}`);
    }

    return true;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('连接超时，请稍后再试');
    if (/Failed to fetch|NetworkError|Load failed/i.test(error.message)) {
      throw new Error('连接失败：浏览器无法访问该接口，请检查网络或服务商是否允许网页请求');
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function getCalendarDays(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      iso: getISODate(date),
      inMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

function getWeekDays(date) {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const item = new Date(start);
    item.setDate(start.getDate() + index);
    return {
      date: item,
      iso: getISODate(item),
      inMonth: true,
    };
  });
}

function searchEntries(entries, query) {
  const keyword = String(query || '').trim().toLowerCase();
  if (!keyword) return [];

  return entries.filter((entry) => {
    const type = entryTypes[entry.type] || entryTypes.note;
    const haystack = [
      entry.date,
      entry.type,
      type.label,
      entry.project,
      entry.formalText,
      entry.rawText,
    ].join(' ').toLowerCase();

    return haystack.includes(keyword);
  });
}

function getCommonProjects(entries) {
  const counts = new Map();

  entries.forEach((entry) => {
    const project = String(entry.project || '').trim();
    if (!project) return;
    const key = normalizeProjectKey(project);
    const current = counts.get(key) || { label: project, count: 0, lastDate: '' };
    counts.set(key, {
      label: current.label,
      count: current.count + 1,
      lastDate: entry.date > current.lastDate ? entry.date : current.lastDate,
    });
  });

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate) || a.label.localeCompare(b.label, 'zh-CN'))
    .slice(0, 6)
    .map((item) => item.label);
}

function buildProjectSummaries(entries, goals = {}, projectMeta = {}) {
  const map = new Map();
  const openGoals = getOpenGoals(goals);

  entries.forEach((entry) => {
    const label = String(entry.project || '').trim();
    if (!label) return;

    const key = normalizeProjectKey(label);
    const current = map.get(key) || {
      key,
      label,
      entries: [],
      total: 0,
      workCount: 0,
      todoCount: 0,
      riskCount: 0,
      lastDate: '',
    };

    current.entries.push(entry);
    current.total += 1;
    current.workCount += entry.type === 'work' ? 1 : 0;
    current.todoCount += entry.type === 'todo' ? 1 : 0;
    current.riskCount += entry.type === 'risk' ? 1 : 0;
    current.lastDate = entry.date > current.lastDate ? entry.date : current.lastDate;
    map.set(key, current);
  });

  return Array.from(map.values())
    .map((project) => {
      const sortedEntries = [...project.entries].sort(sortEntriesDesc);
      const relatedGoals = openGoals.filter((goal) => isGoalRelatedToProject(goal.text, project.label)).slice(0, 4);
      const meta = projectMeta[project.key] || {};
      const archived = Boolean(meta.archived);
      const projectWithMeta = {
        ...project,
        archived,
      };

      return {
        ...projectWithMeta,
        entries: sortedEntries,
        todoEntries: sortedEntries.filter((entry) => entry.type === 'todo'),
        riskEntries: sortedEntries.filter((entry) => entry.type === 'risk'),
        relatedGoals,
        status: getProjectStatus(projectWithMeta),
      };
    })
    .sort((a, b) => Number(a.archived) - Number(b.archived) || b.lastDate.localeCompare(a.lastDate) || b.total - a.total || a.label.localeCompare(b.label, 'zh-CN'));
}

function filterProjectSummaries(projects, query, filter) {
  const keyword = String(query || '').trim().toLowerCase();

  return projects.filter((project) => {
    if (filter === 'all' && project.archived) return false;
    if (filter && filter !== 'all' && project.status.key !== filter) return false;
    if (!keyword) return true;

    const haystack = [
      project.label,
      project.lastDate,
      project.status.label,
      ...project.entries.slice(0, 8).map((entry) => `${entry.date} ${entry.formalText} ${entry.rawText}`),
    ].join(' ').toLowerCase();

    return haystack.includes(keyword);
  });
}

function sortEntriesDesc(a, b) {
  return b.date.localeCompare(a.date) || String(b.id || '').localeCompare(String(a.id || ''));
}

function getOpenGoals(goals = {}) {
  const year = Array.isArray(goals.year) ? goals.year : [];
  const stage = Array.isArray(goals.stage) ? goals.stage : [];

  return [
    ...year.filter((goal) => !goal.done).map((goal) => ({ ...goal, period: 'year' })),
    ...stage.filter((goal) => !goal.done).map((goal) => ({ ...goal, period: 'stage' })),
  ];
}

function isGoalRelatedToProject(goalText, projectLabel) {
  const goal = normalizeRelationText(goalText);
  const project = normalizeRelationText(projectLabel);
  if (!goal || !project) return false;
  return goal.includes(project) || project.includes(goal);
}

function normalizeRelationText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '');
}

function getProjectStatus(project) {
  if (project.archived) return { key: 'archived', label: '已归档', color: '#64748b', tint: '#f1f5f9' };
  if (project.riskCount > 0) return { key: 'risk', label: '有风险', color: '#dc2626', tint: '#fee2e2' };
  if (project.todoCount > 0) return { key: 'todo', label: '待推进', color: '#b45309', tint: '#fef3c7' };
  if (daysSince(project.lastDate) > 14) return { key: 'stale', label: '待更新', color: '#64748b', tint: '#f1f5f9' };
  return { key: 'active', label: '推进中', color: '#111827', tint: '#e5e7eb' };
}

function daysSince(isoDate) {
  if (!isISODateString(isoDate)) return Number.POSITIVE_INFINITY;
  const start = parseISODate(isoDate).getTime();
  return Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
}

function filterEntriesForReport(entries, range) {
  const { start, end } = range;
  return entries.filter((entry) => {
    if (start && entry.date < start) return false;
    if (end && entry.date > end) return false;
    return true;
  });
}

function filterEntriesByProject(entries, project) {
  if (!project || project === 'all') return entries;
  return entries.filter((entry) => normalizeProjectKey(entry.project) === project);
}

function getReportProjects(entries) {
  const seen = new Map();

  entries.forEach((entry) => {
    const label = String(entry.project || '').trim();
    if (!label) return;
    const key = normalizeProjectKey(label);
    if (!seen.has(key)) seen.set(key, label);
  });

  return Array.from(seen.entries())
    .sort((a, b) => a[1].localeCompare(b[1], 'zh-CN'))
    .map(([key, label]) => ({ key, label }));
}

function normalizeProjectKey(project) {
  return String(project || '').trim().toLowerCase();
}

function getProjectLabel(project, projects = []) {
  if (!project || project === 'all') return '全部项目';
  return projects.find((item) => item.key === project)?.label || project;
}

function getDateRangeByPreset(preset, entries = []) {
  if (preset === 'all') return getEntriesDateRange(entries);

  const today = new Date();
  if (preset === 'recent7') {
    return { start: getISODate(addDays(today, -6)), end: getISODate(today) };
  }

  if (preset === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: getISODate(start), end: getISODate(end) };
  }

  const base = preset === 'previous' ? addDays(today, -7) : today;
  const week = getWeekDays(base);
  return { start: week[0].iso, end: week[week.length - 1].iso };
}

function getEntriesDateRange(entries) {
  const dates = entries.map((entry) => entry.date).filter(isISODateString).sort();
  if (!dates.length) return getDateRangeByPreset('current');
  return { start: dates[0], end: dates[dates.length - 1] };
}

function normalizeDateRange(start, end) {
  const normalizedStart = isISODateString(start) ? start : '';
  const normalizedEnd = isISODateString(end) ? end : '';

  if (normalizedStart && normalizedEnd && normalizedStart > normalizedEnd) {
    return { start: normalizedEnd, end: normalizedStart };
  }

  return { start: normalizedStart, end: normalizedEnd };
}

function isISODateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function getReportRangeTitle(range, dateRange) {
  if (range === 'previous') return '上周报告';
  if (range === 'recent7') return '近 7 天报告';
  if (range === 'month') return '本月报告';
  if (range === 'all') return '全部记录报告';
  if (range === 'custom') return `${dateRange.start || '开始'} 至 ${dateRange.end || '结束'}`;
  return '本周报告';
}

function getReportKindLabel(kind) {
  return reportKindOptions.find((option) => option.key === kind)?.label || '报告';
}

function getReportTitle(kind, range, dateRange, projectLabel) {
  if (kind === 'project' && projectLabel && projectLabel !== '全部项目') return `${projectLabel}项目复盘`;
  if (kind === 'daily') return `${dateRange.start || getISODate()} 今日总结`;
  if (kind === 'stage') return '阶段总结';
  return getReportRangeTitle(range, dateRange);
}

function buildReportFromTemplate(entries, template, dateRange, reportRange, projectLabel, context = {}) {
  const values = buildReportTemplateValues(entries, dateRange, reportRange, projectLabel, context);
  const source = String(template || '').trim() || defaultReportTemplate;

  return Object.entries(values).reduce((text, [key, value]) => (
    text.split(`{${key}}`).join(value)
  ), source);
}

function buildReportTemplateValues(entries, dateRange, reportRange, projectLabel, context = {}) {
  const materials = { ...defaultReportMaterials, ...(context.materials || {}) };
  const byType = {
    work: entries.filter((entry) => entry.type === 'work'),
    risk: entries.filter((entry) => entry.type === 'risk'),
    life: entries.filter((entry) => entry.type === 'life'),
    todo: entries.filter((entry) => entry.type === 'todo'),
  };

  return {
    报告标题: getReportTitle(context.kind, reportRange, dateRange, projectLabel),
    报告类型: getReportKindLabel(context.kind),
    起始日期: dateRange.start || '未设置',
    结束日期: dateRange.end || '未设置',
    项目范围: projectLabel || '全部项目',
    记录数: String(entries.length),
    完成事项: toReportLines(byType.work, '暂无完成事项记录'),
    问题风险: materials.includeRisk ? toReportLines(byType.risk, '暂无明显风险') : '- 本次报告未纳入风险材料',
    生活记录: materials.includeLife ? toReportLines(byType.life, '暂无生活记录') : '- 本次报告未纳入生活记录',
    后续计划: toReportLines(byType.todo, '暂无待跟进事项'),
    目标提醒: materials.includeGoals ? formatGoalMaterials(context.goals) : '- 本次报告未纳入目标提醒',
    灵感清单: materials.includeIdeas ? formatIdeaWishMaterials(context.ideas, context.wishes) : '- 本次报告未纳入灵感清单',
    全部记录: entries.length ? entries.map(formatReportEntryLine).join('\n') : '- 暂无记录',
  };
}

function toReportLines(entries, empty) {
  return entries.length ? entries.map((entry) => `- ${entry.formalText}`).join('\n') : `- ${empty}`;
}

function formatReportEntryLine(entry) {
  const type = entryTypes[entry.type] || entryTypes.note;
  return `- ${entry.date} ${type.label}｜${entry.project}：${entry.formalText}`;
}

function formatGoalMaterials(goals = {}) {
  const year = Array.isArray(goals.year) ? goals.year : [];
  const stage = Array.isArray(goals.stage) ? goals.stage : [];
  const lines = [
    ...year.filter((goal) => !goal.done).map((goal) => `- 年度目标：${goal.text}`),
    ...stage.filter((goal) => !goal.done).map((goal) => `- 阶段目标：${goal.text}`),
  ];

  return lines.length ? lines.join('\n') : '- 暂无目标提醒';
}

function formatIdeaWishMaterials(ideas = [], wishes = []) {
  const lines = [
    ...ideas.slice(0, 5).map((item) => `- 灵感：${item}`),
    ...wishes.slice(0, 5).map((item) => `- 清单：${item}`),
  ];

  return lines.length ? lines.join('\n') : '- 暂无灵感或清单';
}

function buildMaterialSummary(goals = {}, ideas = [], wishes = []) {
  const year = Array.isArray(goals.year) ? goals.year : [];
  const stage = Array.isArray(goals.stage) ? goals.stage : [];
  const openGoals = [...year, ...stage].filter((goal) => !goal.done).length;
  const ideaCount = Array.isArray(ideas) ? ideas.length : 0;
  const wishCount = Array.isArray(wishes) ? wishes.length : 0;
  const total = openGoals + ideaCount + wishCount;

  return {
    openGoals,
    ideas: ideaCount,
    wishes: wishCount,
    total,
    hasMaterials: total > 0,
    label: total > 0
      ? `${openGoals} 个目标、${ideaCount} 条灵感、${wishCount} 个清单可作为复盘材料`
      : '还没有目标、灵感或清单材料',
  };
}

function parseISODate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatMonth(date) {
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
}

function formatWeekRange(days) {
  const first = days[0].date;
  const last = days[days.length - 1].date;
  return `${first.getMonth() + 1}.${first.getDate()} - ${last.getMonth() + 1}.${last.getDate()}`;
}

function isToday(value) {
  return value === getISODate();
}

function formatMonthDay(date) {
  return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
}

function formatFullDate(date) {
  return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
}

function formatSyncTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '暂无';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPasswordStrength(password) {
  const value = String(password || '');
  if (!value) return { value: 0, percent: 0, label: '', color: '#94a3b8' };

  let score = 0;
  if (value.length >= 6) score += 1;
  if (value.length >= 10) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score <= 1) return { value, percent: 28, label: '密码强度：弱', color: '#dc2626' };
  if (score <= 3) return { value, percent: 64, label: '密码强度：中', color: '#d97706' };
  return { value, percent: 100, label: '密码强度：强', color: '#16a34a' };
}

function loadStored(key, fallback) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStored(key, value) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage can be unavailable in private browsing or restricted WebViews.
  }
}

async function cloudRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }

  return data;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim().toLowerCase());
}

function inferModelProvider(endpoint = '') {
  const normalized = String(endpoint || '').toLowerCase();
  const matched = modelProviders.find((provider) => provider.endpoint && normalized.includes(provider.endpoint.toLowerCase().replace('/chat/completions', '').replace('/v1/chat/completions', '')));
  return matched?.key || 'custom';
}

function buildReportSections(entries) {
  const configs = [
    { type: 'work', title: '完成事项', empty: '暂无完成事项记录', icon: 'checkbox', color: '#111827', tint: '#f1f5f9' },
    { type: 'risk', title: '问题与风险', empty: '暂无明显风险', icon: 'alert-circle', color: '#dc2626', tint: '#fee2e2' },
    { type: 'life', title: '生活记录', empty: '暂无生活记录', icon: 'heart', color: '#7c3aed', tint: '#ede9fe' },
    { type: 'todo', title: '后续计划', empty: '暂无待跟进事项', icon: 'arrow-forward-circle', color: '#b45309', tint: '#fef3c7' },
  ];

  return configs.map((config) => {
    const items = entries
      .filter((entry) => entry.type === config.type)
      .map((entry) => entry.formalText);

    return {
      ...config,
      items: items.length ? items : [config.empty],
    };
  });
}

const softShadow = {
  shadowColor: '#0f172a',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.08,
  shadowRadius: 22,
  elevation: 3,
};

const lightShadow = {
  shadowColor: '#0f172a',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.05,
  shadowRadius: 14,
  elevation: 2,
};

const styles = StyleSheet.create({
  shell: { flex: 1, position: 'relative', backgroundColor: '#f5f6f8' },
  wishShell: { backgroundColor: '#f5f6f8' },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  tabPane: { flex: 1 },
  scrollContent: { paddingBottom: 104 },
  todayHeader: { marginTop: 6, marginBottom: 12 },
  todayEyebrow: { color: '#64748b', fontSize: 13, fontWeight: '900' },
  todayTitle: { marginTop: 3, color: '#111827', fontSize: 26, fontWeight: '900' },
  composerCard: { ...softShadow, padding: 12, borderRadius: 8, backgroundColor: '#fff', marginTop: 4 },
  input: { minHeight: 48, borderWidth: 0, borderRadius: 8, paddingHorizontal: 13, backgroundColor: '#f4f6f8', color: '#111827', fontWeight: '700' },
  textarea: { minHeight: 126, borderWidth: 0, borderRadius: 8, padding: 13, backgroundColor: '#f4f6f8', color: '#111827', textAlignVertical: 'top', lineHeight: 21 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  tag: { borderWidth: 0, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f4f6f8' },
  tagText: { color: '#64748b', fontWeight: '900' },
  activeTag: { backgroundColor: '#111827', borderColor: '#111827' },
  activeTagText: { color: '#fff' },
  fieldLabel: { marginTop: 12, marginBottom: 8, color: '#64748b', fontSize: 12, fontWeight: '900' },
  commonProjectPanel: { marginTop: 2 },
  commonProjectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  commonProjectChip: { maxWidth: '100%', minHeight: 32, borderRadius: 8, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  commonProjectText: { maxWidth: 160, color: '#334155', fontSize: 12, fontWeight: '900' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryActionButton: { ...lightShadow, flex: 1, minHeight: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  secondaryActionButton: { flex: 1, minHeight: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  secondaryActionText: { color: '#111827', fontWeight: '900' },
  primaryButton: { minHeight: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  primaryButtonText: { color: '#fff', fontWeight: '900' },
  secondaryButton: { minHeight: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', marginTop: 12 },
  secondaryButtonText: { color: '#fff', fontWeight: '900' },
  logoutButton: { minHeight: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee2e2', marginTop: 10 },
  logoutButtonText: { color: '#b91c1c', fontWeight: '900' },
  passwordStrength: { gap: 6, marginTop: -2, marginBottom: 2 },
  passwordTrack: { height: 6, borderRadius: 8, overflow: 'hidden', backgroundColor: '#e2e8f0' },
  passwordFill: { height: 6, borderRadius: 8 },
  passwordStrengthText: { fontSize: 12, fontWeight: '900' },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  providerCard: { width: '48%', minHeight: 74, borderRadius: 8, padding: 10, justifyContent: 'center', backgroundColor: '#f4f6f8', borderWidth: 1, borderColor: '#f4f6f8' },
  activeProviderCard: { backgroundColor: '#111827', borderColor: '#111827' },
  providerName: { color: '#111827', fontSize: 14, fontWeight: '900' },
  activeProviderName: { color: '#fff' },
  providerHint: { marginTop: 4, color: '#64748b', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  activeProviderHint: { color: '#dbe4ef' },
  modelTestButton: { minHeight: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  modelTestButtonText: { color: '#111827', fontWeight: '900' },
  draftCard: { ...softShadow, gap: 8, borderRadius: 8, padding: 14, backgroundColor: '#fff', marginTop: 14 },
  directDraftCard: { backgroundColor: '#fff' },
  sectionTitle: { marginTop: 20, marginBottom: 10, color: '#111827', fontSize: 18, fontWeight: '900' },
  cardLabel: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  swipeShell: { position: 'relative', overflow: 'hidden', borderRadius: 8, marginBottom: 10 },
  swipeDelete: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 88, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: '#ef4444' },
  swipeDeleteText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  entryCard: { ...lightShadow, flexDirection: 'row', gap: 10, borderRadius: 8, padding: 12, backgroundColor: '#fff' },
  highlightedEntryCard: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#111827' },
  typeBadge: { width: 54, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  typeText: { marginTop: 3, fontSize: 12, fontWeight: '900' },
  entryBody: { flex: 1 },
  entryEditPanel: { gap: 8 },
  entryEditInput: { minHeight: 40, borderWidth: 1, borderColor: '#d7dce5', borderRadius: 8, paddingHorizontal: 10, backgroundColor: '#fff', color: '#111827' },
  entryEditTextarea: { minHeight: 86, paddingTop: 10, textAlignVertical: 'top' },
  entryEditActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  entryEditGhostButton: { minWidth: 66, minHeight: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d7dce5', backgroundColor: '#fff' },
  entryEditGhostText: { color: '#334155', fontWeight: '900' },
  entryEditSaveButton: { minWidth: 66, minHeight: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  entryEditSaveText: { color: '#fff', fontWeight: '900' },
  entryProject: { flex: 1 },
  project: { color: '#111827', fontSize: 16, fontWeight: '900' },
  bodyText: { marginTop: 4, color: '#475569', lineHeight: 22 },
  calendarCard: { ...softShadow, borderRadius: 8, padding: 12, backgroundColor: '#fff', marginTop: 4 },
  calendarToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthTitle: { color: '#111827', fontSize: 18, fontWeight: '900' },
  monthButton: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  monthButtonText: { color: '#334155', fontSize: 24, fontWeight: '900' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekText: { flex: 1, textAlign: 'center', color: '#64748b', fontSize: 12, fontWeight: '900' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthDay: { width: '14.2857%', minHeight: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  mutedMonthDay: { opacity: 0.38 },
  activeMonthDay: { backgroundColor: '#111827', borderColor: '#111827' },
  monthDayText: { color: '#111827', fontWeight: '900' },
  activeMonthDayText: { color: '#fff' },
  monthCount: { marginTop: 2, color: '#111827', fontSize: 10, fontWeight: '900' },
  activeMonthCount: { color: '#fff' },
  emptyText: { color: '#64748b', lineHeight: 22 },
  searchCard: { ...lightShadow, gap: 8, borderRadius: 8, padding: 12, marginTop: 12, backgroundColor: '#fff' },
  searchInput: { minHeight: 44, borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#f4f6f8', color: '#111827', fontWeight: '800' },
  searchMeta: { color: '#64748b', fontSize: 12, fontWeight: '800' },
  searchResultItem: { marginBottom: 4 },
  searchResultDate: { marginBottom: 6, color: '#64748b', fontSize: 12, fontWeight: '900' },
  reviewPrompt: { ...lightShadow, gap: 12, borderRadius: 8, padding: 12, marginTop: 12, backgroundColor: '#fff' },
  reviewPromptHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  reviewPromptTitle: { marginTop: 3, color: '#111827', fontSize: 18, fontWeight: '900' },
  reviewPromptActions: { flexDirection: 'row', gap: 8 },
  reviewPromptButton: { minHeight: 36, borderRadius: 8, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  reviewPromptButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  reviewGhostButton: { minHeight: 36, borderRadius: 8, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  reviewGhostButtonText: { color: '#111827', fontSize: 12, fontWeight: '900' },
  reviewStatsRow: { flexDirection: 'row', gap: 8 },
  weeklyReviewBox: { gap: 5, borderRadius: 8, padding: 10, backgroundColor: '#f8fafc' },
  weeklyReviewTitle: { color: '#111827', lineHeight: 20, fontWeight: '900' },
  weeklyReviewLine: { color: '#475569', lineHeight: 19, fontSize: 12, fontWeight: '700' },
  reviewMaterialLine: { minHeight: 40, borderRadius: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: '#f8fafc' },
  reviewMaterialText: { flex: 1, color: '#475569', fontSize: 12, lineHeight: 18, fontWeight: '800' },
  reviewMaterialAction: { color: '#111827', fontSize: 12, fontWeight: '900' },
  reviewInsightCard: { ...lightShadow, gap: 10, borderRadius: 8, padding: 12, marginTop: 12, marginBottom: 2, backgroundColor: '#fff' },
  reviewInsightPanel: { gap: 10, borderRadius: 8, padding: 12, marginTop: 10, backgroundColor: '#f8fafc' },
  reviewInsightHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  reviewInsightTitleWrap: { flex: 1 },
  reviewInsightTitle: { marginTop: 3, color: '#111827', fontSize: 17, lineHeight: 22, fontWeight: '900' },
  reviewGenerateButton: { minHeight: 36, borderRadius: 8, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  reviewGenerateText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  reviewMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewSourceBadge: { overflow: 'hidden', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, color: '#111827', fontSize: 11, fontWeight: '900', backgroundColor: '#e5e7eb' },
  reviewTimeText: { color: '#94a3b8', fontSize: 11, fontWeight: '800' },
  reviewSummary: { color: '#111827', lineHeight: 22, fontWeight: '900' },
  reviewList: { gap: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  reviewListTitle: { color: '#111827', fontSize: 13, fontWeight: '900' },
  reviewListItem: { color: '#475569', lineHeight: 20, fontSize: 13, fontWeight: '700' },
  reviewEmptyText: { color: '#64748b', lineHeight: 21, fontWeight: '700' },
  reviewNotice: { color: '#64748b', fontSize: 12, lineHeight: 18, fontWeight: '800' },
  onboardingOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 40, justifyContent: 'center', padding: 18 },
  onboardingBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(15,23,42,0.24)' },
  onboardingCard: { ...softShadow, maxHeight: '92%', borderRadius: 12, padding: 16, backgroundColor: '#fff' },
  onboardingEyebrow: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  onboardingTitle: { marginTop: 6, color: '#111827', fontSize: 24, lineHeight: 31, fontWeight: '900' },
  onboardingBody: { marginTop: 8, color: '#475569', lineHeight: 22, fontWeight: '700' },
  onboardingProfiles: { gap: 8, marginTop: 14 },
  onboardingProfile: { borderRadius: 8, padding: 11, backgroundColor: '#f4f6f8', borderWidth: 1, borderColor: '#f4f6f8' },
  activeOnboardingProfile: { backgroundColor: '#111827', borderColor: '#111827' },
  onboardingProfileTitle: { color: '#111827', fontSize: 14, fontWeight: '900' },
  activeOnboardingProfileTitle: { color: '#fff' },
  onboardingProfileText: { marginTop: 4, color: '#64748b', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  activeOnboardingProfileText: { color: '#dbe4ef' },
  onboardingPreview: { gap: 4, borderRadius: 8, padding: 12, marginTop: 12, backgroundColor: '#f8fafc' },
  emptyProjectCard: { ...softShadow, borderRadius: 8, padding: 16, backgroundColor: '#fff', marginTop: 6 },
  projectHero: { ...softShadow, gap: 14, borderRadius: 8, padding: 14, backgroundColor: '#fff', marginTop: 6 },
  projectHeroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  projectDashboardTitle: { marginTop: 4, color: '#111827', fontSize: 24, fontWeight: '900' },
  projectStatusBadge: { minHeight: 32, borderRadius: 8, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  projectStatusText: { fontSize: 12, fontWeight: '900' },
  projectStatsRow: { flexDirection: 'row', gap: 8 },
  projectStat: { flex: 1, minHeight: 58, borderRadius: 8, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  projectStatValue: { color: '#111827', fontSize: 18, fontWeight: '900' },
  projectStatLabel: { marginTop: 2, color: '#64748b', fontSize: 11, fontWeight: '900' },
  projectIndexCard: { ...lightShadow, gap: 10, borderRadius: 8, padding: 12, backgroundColor: '#fff', marginBottom: 10 },
  projectIndexHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  projectIndexMeta: { marginTop: 3, color: '#64748b', fontSize: 12, fontWeight: '800' },
  projectIndexCount: { minWidth: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  projectIndexCountText: { color: '#111827', fontSize: 15, fontWeight: '900' },
  projectSearchInput: { minHeight: 44, borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#f4f6f8', color: '#111827', fontWeight: '800' },
  projectFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  projectFilterChip: { minHeight: 32, borderRadius: 8, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  activeProjectFilterChip: { backgroundColor: '#111827' },
  projectFilterText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  activeProjectFilterText: { color: '#fff' },
  projectList: { gap: 8 },
  projectListItem: { minHeight: 58, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc' },
  activeProjectListItem: { backgroundColor: '#111827' },
  projectListMain: { flex: 1 },
  projectListTitle: { color: '#111827', fontSize: 14, fontWeight: '900' },
  activeProjectListTitle: { color: '#fff' },
  projectListMeta: { marginTop: 4, color: '#64748b', fontSize: 11, fontWeight: '800' },
  activeProjectListMeta: { color: '#dbe4ef' },
  projectListStatus: { minHeight: 28, borderRadius: 8, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  projectListStatusText: { fontSize: 11, fontWeight: '900' },
  projectListHint: { color: '#64748b', fontSize: 12, lineHeight: 18, fontWeight: '800' },
  projectRail: { gap: 8, paddingVertical: 12 },
  projectRailCard: { width: 150, minHeight: 68, borderRadius: 8, padding: 11, justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eef2f7' },
  activeProjectRailCard: { backgroundColor: '#111827', borderColor: '#111827' },
  projectRailTitle: { color: '#111827', fontSize: 14, fontWeight: '900' },
  activeProjectRailTitle: { color: '#fff' },
  projectRailMeta: { marginTop: 5, color: '#64748b', fontSize: 11, fontWeight: '800' },
  activeProjectRailMeta: { color: '#dbe4ef' },
  projectActionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  projectPrimaryAction: { ...lightShadow, flex: 1, minHeight: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  projectSecondaryAction: { flex: 1, minHeight: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  projectManageCard: { ...lightShadow, gap: 10, borderRadius: 8, padding: 12, backgroundColor: '#fff', marginBottom: 10 },
  projectManageHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  archiveButton: { minWidth: 56, minHeight: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  restoreButton: { backgroundColor: '#111827' },
  archiveButtonText: { color: '#334155', fontSize: 12, fontWeight: '900' },
  restoreButtonText: { color: '#fff' },
  projectRenameRow: { flexDirection: 'row', gap: 8 },
  projectRenameInput: { flex: 1, minHeight: 42, borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#f4f6f8', color: '#111827', fontWeight: '800' },
  projectRenameButton: { minWidth: 72, minHeight: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  projectRenameButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  projectFocusCard: { ...lightShadow, gap: 10, borderRadius: 8, padding: 12, backgroundColor: '#fff', marginBottom: 10 },
  projectSplitRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  projectSplitCard: { ...lightShadow, flex: 1, gap: 10, minHeight: 132, borderRadius: 8, padding: 12, backgroundColor: '#fff' },
  projectEntryList: { gap: 10 },
  projectTimelineItem: { flexDirection: 'row', gap: 9, paddingTop: 2 },
  compactProjectTimelineItem: { gap: 8 },
  projectTimelineDot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  projectTimelineBody: { flex: 1 },
  projectTimelineMeta: { color: '#64748b', fontSize: 11, fontWeight: '900' },
  projectTimelineText: { marginTop: 2, color: '#334155', lineHeight: 20, fontWeight: '700' },
  projectGoalItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  projectGoalPeriod: { minWidth: 42, minHeight: 26, borderRadius: 8, paddingHorizontal: 8, textAlign: 'center', lineHeight: 26, overflow: 'hidden', color: '#111827', fontSize: 12, fontWeight: '900', backgroundColor: '#f4f6f8' },
  projectGoalText: { flex: 1, color: '#334155', lineHeight: 21, fontWeight: '700' },
  fab: { ...softShadow, position: 'absolute', right: 6, bottom: 18, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  composerOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20, justifyContent: 'flex-end' },
  composerBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(15,23,42,0.18)' },
  bottomSheet: { ...softShadow, maxHeight: '72%', minHeight: 420, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18, backgroundColor: '#fff' },
  sheetHandle: { alignSelf: 'center', width: 42, height: 5, borderRadius: 8, backgroundColor: '#d7dce5', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sheetTitle: { marginTop: 2, color: '#111827', fontSize: 20, fontWeight: '900' },
  sheetCloseButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  reportCard: { ...softShadow, borderRadius: 8, padding: 14, backgroundColor: '#fff', marginTop: 4 },
  reportHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  reportEyebrow: { color: '#94a3b8', fontSize: 12, fontWeight: '900' },
  reportTitle: { marginTop: 2, color: '#111827', fontSize: 24, fontWeight: '900' },
  reportCountBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#f4f6f8' },
  reportCountText: { color: '#334155', fontSize: 12, fontWeight: '900' },
  reportRangeSwitch: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 5, marginBottom: 8, borderRadius: 8, backgroundColor: '#f4f6f8' },
  reportRangeChip: { minWidth: 72, minHeight: 34, borderRadius: 8, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  activeReportRangeChip: { backgroundColor: '#111827' },
  reportRangeText: { color: '#64748b', fontWeight: '900', fontSize: 12 },
  activeReportRangeText: { color: '#fff' },
  reportKindPanel: { gap: 8, marginBottom: 8 },
  reportKindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reportKindChip: { minHeight: 34, borderRadius: 8, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  activeReportKindChip: { backgroundColor: '#111827' },
  reportKindText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  activeReportKindText: { color: '#fff' },
  reportMaterialPanel: { gap: 8, marginBottom: 10 },
  materialInline: { borderRadius: 8, padding: 10, backgroundColor: '#f8fafc' },
  materialInlineText: { color: '#64748b', fontSize: 12, lineHeight: 18, fontWeight: '800' },
  materialChip: { minHeight: 32, borderRadius: 8, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  activeMaterialChip: { backgroundColor: '#111827' },
  materialText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  activeMaterialText: { color: '#fff' },
  reportDateRow: { flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 10 },
  reportDateField: { flex: 1 },
  dateInput: { minHeight: 42, borderRadius: 8, paddingHorizontal: 11, backgroundColor: '#f4f6f8', color: '#111827', fontWeight: '900' },
  projectFilterPanel: { gap: 8, marginBottom: 10 },
  filterLabel: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  projectChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  projectChip: { maxWidth: '100%', minHeight: 34, borderRadius: 8, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  activeProjectChip: { backgroundColor: '#111827' },
  projectChipText: { maxWidth: 180, color: '#64748b', fontSize: 12, fontWeight: '900' },
  activeProjectChipText: { color: '#fff' },
  templatePanel: { gap: 8, borderRadius: 8, padding: 12, marginBottom: 8, backgroundColor: '#f8fafc' },
  templateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  templateResetButton: { minHeight: 30, borderRadius: 8, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  templateResetText: { color: '#111827', fontSize: 12, fontWeight: '900' },
  templateInput: { minHeight: 168, borderRadius: 8, padding: 12, backgroundColor: '#fff', color: '#111827', lineHeight: 21, textAlignVertical: 'top' },
  templateHelp: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  reportSummaryPanel: { borderRadius: 8, padding: 12, backgroundColor: '#fff' },
  reportSummaryTitle: { marginBottom: 2, color: '#111827', fontSize: 15, fontWeight: '900' },
  reportSection: { flexDirection: 'row', gap: 10, paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  reportSectionIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  reportSectionBody: { flex: 1, gap: 6 },
  reportSectionTitle: { color: '#111827', fontSize: 16, fontWeight: '900' },
  reportBullet: { color: '#475569', lineHeight: 22 },
  reportPreviewTitle: { marginTop: 4, marginBottom: 8, color: '#111827', fontSize: 16, fontWeight: '900' },
  reportPreviewBox: { borderRadius: 8, padding: 12, backgroundColor: '#f8fafc' },
  reportPreviewText: { color: '#334155', lineHeight: 21, fontWeight: '700' },
  reportCopyButton: { ...lightShadow, minHeight: 48, marginTop: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#111827' },
  reportCopyText: { color: '#fff', fontWeight: '900' },
  advancedToggle: { minHeight: 44, marginTop: 10, borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f4f6f8' },
  advancedToggleText: { color: '#111827', fontWeight: '900' },
  advancedToggleIcon: { color: '#111827', fontSize: 20, fontWeight: '900' },
  copyButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 10, backgroundColor: '#fff' },
  copyButtonText: { color: '#111827', fontWeight: '900' },
  copyNotice: { marginTop: 10, color: '#64748b', fontWeight: '900', textAlign: 'center' },
  helpText: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  settingsCard: { ...lightShadow, gap: 10, borderRadius: 8, padding: 12, backgroundColor: '#fff' },
  dataBoundaryRow: { gap: 3, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  dataBoundaryTitle: { color: '#111827', fontSize: 14, fontWeight: '900' },
  dataBoundaryText: { color: '#64748b', lineHeight: 20, fontWeight: '700' },
  materialBridgeCard: { ...lightShadow, gap: 12, borderRadius: 8, padding: 12, backgroundColor: '#fff', marginBottom: 14 },
  materialBridgeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  materialBridgeTitle: { marginTop: 3, color: '#111827', fontSize: 18, fontWeight: '900' },
  materialBridgeCount: { minWidth: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  materialBridgeCountText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  materialBridgeStats: { flexDirection: 'row', gap: 8 },
  moduleSwitch: { ...lightShadow, flexDirection: 'row', gap: 8, marginBottom: 14, padding: 5, borderRadius: 8, backgroundColor: '#fff' },
  moduleChip: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  activeModuleChip: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#111827' },
  moduleChipText: { color: '#64748b', fontWeight: '900' },
  activeModuleChipText: { color: '#fff' },
  glyphBox: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  glyph: { minWidth: 14, textAlign: 'center', fontWeight: '900', includeFontPadding: false },
  moduleInput: { minHeight: 96, marginBottom: 10, borderWidth: 0, borderRadius: 8, padding: 12, backgroundColor: '#fff', textAlignVertical: 'top' },
  wishInput: { borderColor: '#d7dce5', backgroundColor: '#fff' },
  wishPrimaryButton: { minHeight: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', marginBottom: 18 },
  wishSecondaryButton: { minHeight: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', marginTop: 12 },
  wishSecondaryButtonText: { color: '#fff', fontWeight: '900' },
  moduleCard: { ...lightShadow, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 8, padding: 12, backgroundColor: '#fff', marginBottom: 10 },
  moduleIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  moduleText: { flex: 1, color: '#334155', lineHeight: 21, fontWeight: '700' },
  convertButton: { minHeight: 30, borderRadius: 8, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  convertButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  goalPanel: { ...lightShadow, gap: 8, borderRadius: 8, padding: 14, marginBottom: 10 },
  yearGoalPanel: { backgroundColor: '#fff' },
  stageGoalPanel: { backgroundColor: '#fff' },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalMark: { width: 8, height: 22, borderRadius: 8 },
  yearGoalMark: { backgroundColor: '#111827' },
  stageGoalMark: { backgroundColor: '#64748b' },
  goalTitle: { color: '#111827', fontSize: 16, fontWeight: '900' },
  goalItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 },
  doneGoalItem: { opacity: 0.62 },
  goalStatus: { minWidth: 58, minHeight: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9, backgroundColor: '#f97316', borderWidth: 1, borderColor: '#ea580c' },
  doneGoalStatus: { flexDirection: 'row', gap: 3, borderColor: '#16a34a', backgroundColor: '#16a34a' },
  goalStatusText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  doneGoalStatusText: { color: '#fff' },
  goalText: { flex: 1, color: '#334155', lineHeight: 21, fontWeight: '700' },
  doneGoalText: { color: '#64748b', textDecorationLine: 'line-through' },
  goalConvert: { minWidth: 42, minHeight: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  goalConvertText: { color: '#111827', fontSize: 12, fontWeight: '900' },
  goalDelete: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  emptyPanel: { color: '#64748b', lineHeight: 21, fontWeight: '700' },
  undoToast: { ...softShadow, position: 'absolute', left: 22, right: 22, bottom: 86, zIndex: 30, minHeight: 48, borderRadius: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111827' },
  undoToastText: { color: '#fff', fontWeight: '900' },
  undoButton: { minHeight: 32, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  undoButtonText: { color: '#111827', fontWeight: '900' },
  tabbar: { ...softShadow, flexDirection: 'row', backgroundColor: '#fff', paddingBottom: 9, paddingTop: 9, paddingHorizontal: 5, marginHorizontal: 14, marginBottom: 10, borderRadius: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 2, minHeight: 42, justifyContent: 'center' },
  activeTab: { borderRadius: 8, backgroundColor: '#f4f6f8' },
  tabIconBubble: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef2f7' },
  activeTabIconBubble: { backgroundColor: '#111827' },
  tabText: { color: '#94a3b8', fontSize: 11, fontWeight: '800' },
  activeTabText: { color: '#111827' },
});
