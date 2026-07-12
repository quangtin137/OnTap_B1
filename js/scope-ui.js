import { appState, SECTION_REGISTRY } from './state.js';
import { buildStudyProfile, getScopedBank } from './data.js';

export function renderScopeUI() {
  const container = document.getElementById("scopeTableContainer");
  const msg = document.getElementById("scopeStatusMsg");
  msg.textContent = "";

  const sections = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
  
  let html = `<table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; text-align: left;">
    <thead>
      <tr style="border-bottom: 2px solid #ccc;">
        <th style="padding: 8px;">Section</th>
        <th style="padding: 8px;">Pool Limit (From - To)</th>
        <th style="padding: 8px;">Practice Random</th>
      </tr>
    </thead>
    <tbody>`;

  sections.forEach(s => {
    const reg = SECTION_REGISTRY[s];
    const maxPool = appState.examBank[s] ? appState.examBank[s].length : 0;
    const scopeData = appState.studyProfile.scope[s] || { type: "all" };
    
    let from = 1;
    let to = maxPool;
    let practiceRandom = reg.practiceCount || 1;
    
    if (scopeData.type === "range") {
      from = scopeData.from;
      to = scopeData.to;
      if (scopeData.randomCount) practiceRandom = scopeData.randomCount;
    } else if (scopeData.type === "all") {
      if (scopeData.randomCount) practiceRandom = scopeData.randomCount;
    } else if (scopeData.type === "selection") {
      if (scopeData.randomCount) practiceRandom = scopeData.randomCount;
    }

    let rangeHtml = "";
    let randomHtml = "";
    
    if (s === "H" && appState.selectedMode !== "free_candidate") {
      const reviewedCount = scopeData.reviewedIndexes ? scopeData.reviewedIndexes.length : 0;
      const riskCount = scopeData.unreviewedIndexes ? scopeData.unreviewedIndexes.length : 0;
      rangeHtml = `<span style="color: #666; font-style: italic;">Hệ thống auto (Reviewed: ${reviewedCount}, Risk: ${riskCount})</span>`;
      
      const maxRandom = reviewedCount;
      randomHtml = `<input type="number" id="scope_rnd_${s}" value="${practiceRandom}" min="1" max="${maxRandom}" style="width: 60px;"> / ${maxRandom}`;
    } else {
      if (s === "A" || s === "B" || s === "E") {
        rangeHtml = `
          <input type="number" id="scope_from_${s}" value="${from}" min="1" max="${maxPool}" style="width: 60px;"> - 
          <input type="number" id="scope_to_${s}" value="${to}" min="1" max="${maxPool}" style="width: 60px;"> 
          (Max: ${maxPool})
        `;
        randomHtml = `<input type="number" id="scope_rnd_${s}" value="${practiceRandom}" min="1" style="width: 60px;">`;
      } else {
        rangeHtml = `<span>All (Max: ${maxPool})</span>`;
        randomHtml = `<input type="number" id="scope_rnd_${s}" value="${practiceRandom}" min="1" max="${maxPool}" style="width: 60px;">`;
      }
    }

    html += `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 8px;"><strong>${s}</strong></td>
        <td style="padding: 8px;">${rangeHtml}</td>
        <td style="padding: 8px;">${randomHtml}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

export function initScopeUI() {
  document.getElementById("btnApplyScope").addEventListener("click", () => {
    let hasError = false;
    const sections = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
    
    sections.forEach(s => {
      const scopeData = appState.studyProfile.scope[s] || {};
      const maxPool = appState.examBank[s] ? appState.examBank[s].length : 0;
      
      const rndInput = document.getElementById(`scope_rnd_${s}`);
      let rndVal = rndInput ? parseInt(rndInput.value, 10) : 1;
      if (isNaN(rndVal) || rndVal < 1) {
        rndVal = 1;
        hasError = true;
      }
      
      if (s === "A" || s === "B" || s === "E") {
        const fromInput = document.getElementById(`scope_from_${s}`);
        const toInput = document.getElementById(`scope_to_${s}`);
        
        let fromVal = parseInt(fromInput.value, 10);
        let toVal = parseInt(toInput.value, 10);
        
        if (isNaN(fromVal) || fromVal < 1) {
          fromVal = 1;
          hasError = true;
        }
        if (fromVal > maxPool) {
          fromVal = maxPool;
          hasError = true;
        }
        if (isNaN(toVal) || toVal < 1) {
          toVal = 1;
          hasError = true;
        }
        if (toVal > maxPool) {
          toVal = maxPool;
          hasError = true;
        }
        if (fromVal > toVal) {
          fromVal = 1;
          toVal = maxPool;
          hasError = true;
        }
        
        const poolSize = toVal - fromVal + 1;
        if (rndVal > poolSize) {
          rndVal = poolSize;
          hasError = true;
        }
        
        appState.studyProfile.scope[s] = { type: "range", from: fromVal, to: toVal, randomCount: rndVal };
        
      } else if (s === "H" && appState.selectedMode !== "free_candidate") {
        const reviewedCount = scopeData.reviewedIndexes ? scopeData.reviewedIndexes.length : 0;
        if (rndVal > reviewedCount) {
          rndVal = reviewedCount;
          hasError = true;
        }
        
        appState.studyProfile.scope[s].randomCount = rndVal;
      } else {
        if (rndVal > maxPool) {
          rndVal = maxPool;
          hasError = true;
        }
        appState.studyProfile.scope[s] = { type: "all", randomCount: rndVal };
      }
    });

    appState.scopedBank = getScopedBank(appState.examBank, appState.studyProfile);
    renderScopeUI();

    const msg = document.getElementById("scopeStatusMsg");
    if (hasError) {
      msg.style.color = "var(--bad)";
      msg.textContent = "Một số giá trị không hợp lệ đã được tự động điều chỉnh. Xin kiểm tra lại.";
    } else {
      msg.style.color = "var(--ok)";
      msg.textContent = "Áp dụng scope thành công!";
    }
  });

  document.getElementById("btnResetScope").addEventListener("click", () => {
    appState.studyProfile = buildStudyProfile(appState.selectedMode);
    appState.scopedBank = getScopedBank(appState.examBank, appState.studyProfile);
    renderScopeUI();
    const msg = document.getElementById("scopeStatusMsg");
    msg.style.color = "var(--ok)";
    msg.textContent = "Đã khôi phục scope mặc định.";
  });
}
