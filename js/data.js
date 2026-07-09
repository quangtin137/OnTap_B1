import { appState } from './state.js';
import { getNumericIdOrder } from './utils.js';

export function buildAllScope() {
  const scope = {};
  const sections = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
  sections.forEach(s => {
    scope[s] = { type: "all" };
  });
  return scope;
}

export function buildStudyProfile(mode) {
  const scope = buildAllScope();
  if (mode === "free_candidate") {
    return { mode, scope };
  } else if (mode === "two_week") {
    scope.E = { type: "range", from: 1, to: 25, randomCount: 10 };
    scope.H = { 
      type: "selection", 
      officialPoolIndexes: [0, 1, 2], 
      reviewedIndexes: [0, 1], 
      unreviewedIndexes: [2], 
      randomCount: 1 
    };
    return { mode, scope };
  } else if (mode === "four_week") {
    scope.E = { type: "range", from: 1, to: 30, randomCount: 10 };
    scope.H = { 
      type: "selection", 
      officialPoolIndexes: [0, 1, 2], 
      reviewedIndexes: [0, 1, 2], 
      unreviewedIndexes: [], 
      randomCount: 1 
    };
    return { mode, scope };
  }
  return { mode, scope };
}

export function getScopedBank(examBank, studyProfile) {
  const scoped = {};
  const sections = Object.keys(examBank);
  
  sections.forEach(s => {
    const scopeData = studyProfile.scope[s];
    if (!scopeData || scopeData.type === "all") {
      scoped[s] = [...examBank[s]];
    } else if (scopeData.type === "range") {
      let items = [...examBank[s]];
      items.sort((a, b) => {
        if (a.questionNumber !== undefined && b.questionNumber !== undefined) {
          return a.questionNumber - b.questionNumber;
        }
        const numA = getNumericIdOrder(a);
        const numB = getNumericIdOrder(b);
        if (numA !== Number.POSITIVE_INFINITY || numB !== Number.POSITIVE_INFINITY) {
          return numA - numB;
        }
        return 0;
      });
      scoped[s] = items.slice(scopeData.from - 1, scopeData.to);
    } else if (scopeData.type === "selection") {
      let pool = [];
      scopeData.officialPoolIndexes.forEach(idx => {
        if (examBank[s][idx]) {
          let clone = { ...examBank[s][idx] };
          if (scopeData.reviewedIndexes && scopeData.reviewedIndexes.includes(idx)) {
            clone._isReviewed = true;
          } else {
            clone._isReviewed = false;
          }
          if (scopeData.unreviewedIndexes && scopeData.unreviewedIndexes.includes(idx)) {
            clone._isRisk = true;
          }
          pool.push(clone);
        }
      });
      scoped[s] = pool;
    }
  });
  
  return scoped;
}

export async function loadAllParsedData() {
  const sections = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"];
  const bank = {};
  appState.loadErrors = [];
  
  for (const s of sections) {
    try {
      const res = await fetch(`data/parsed/section-${s}.json`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      
      let items = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data.data && Array.isArray(data.data)) {
        items = data.data;
      } else {
        items = [data];
      }
      
      const filtered = items.filter(item => item.usable !== false);
      bank[s.toUpperCase()] = filtered;
    } catch (e) {
      console.error(`Failed to load section ${s}:`, e);
      appState.loadErrors.push(`Section ${s.toUpperCase()}: ${e.message}`);
    }
  }
  
  if (appState.loadErrors.length > 0) {
    throw new Error("Không thể tải một số files dữ liệu.");
  }
  
  appState.examBank = bank;
  appState.isDataLoaded = true;
}
