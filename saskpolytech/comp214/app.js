// helper: append a new row to the table body
function appendRow(itemName, maxValue) {
    const tbody = document.querySelector('table tbody');
    const tr = document.createElement('tr');
    // mark as a main phase row so recalculation routines find it
    tr.className = 'main-row';
    // escape simple text for safety
    const safeName = String(itemName).replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    tr.innerHTML = `
                <td><div class="form-text">${safeName}</div></td>
                <td class="align-middle"><span class="form-control-plaintext phase-score">--</span><input type="hidden" name="score[]" class="phase-score-hidden" value=""></td>
                <td class="align-middle"><span class="form-control-plaintext">${Number(maxValue)}</span><input type="hidden" name="max[]" value="${Number(maxValue)}"></td>
                <td><input type="text" name="comment[]" class="form-control" placeholder="Comments..."></td>
                <td class="text-center align-middle"><button type="button" class="btn btn-sm btn-primary add-subitem" title="Add sub-item" data-table="phases">+</button></td>
            `;
    tbody.appendChild(tr);
    // recalc group subtotal when a new phase row is added
    try { recalcGroupSubtotal(); } catch (e) { /* ignore if function not yet defined */ }
    // ensure phase recalculation runs for the new row
    try { recalcAllPhases(); } catch (e) {}
}

// Bootstrap modal instance
const addRowModalEl = document.getElementById('addRowModal');
const addRowModal = new bootstrap.Modal(addRowModalEl);

// Show modal when Add Row button clicked
document.getElementById('addRow').addEventListener('click', () => {
    // set sensible defaults
    document.getElementById('newItemName').value = 'New Item';
    document.getElementById('newItemMax').value = 40;
    addRowModal.show();
});

// Handle modal form submission (Add Row)
document.getElementById('modalForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('newItemName');
    const maxInput = document.getElementById('newItemMax');

    const name = nameInput.value.trim() || 'New Item';
    let max = parseFloat(maxInput.value);
    if (!isFinite(max) || max <= 0) { max = 40; }

    appendRow(name, max);
    addRowModal.hide();
});

// Add Subitem modal instance
const addSubitemModalEl = document.getElementById('addSubitemModal');
const addSubitemModal = new bootstrap.Modal(addSubitemModalEl);
let currentParentRow = null;

// Open subitem modal when add-subitem clicked
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-subitem');
    if (!btn) return;
    currentParentRow = btn.closest('tr');
    const table = btn.getAttribute('data-table') || 'phases';
    document.getElementById('subitemTargetTable').value = table;
    document.getElementById('subitemName').value = '';
    addSubitemModal.show();
});

// Handle add-subitem form submit
document.getElementById('addSubitemForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('subitemName').value.trim() || 'Sub-item';
    const maxVal = (document.getElementById('subitemMax') ? document.getElementById('subitemMax').value.trim() : '');
    const table = document.getElementById('subitemTargetTable').value || 'phases';

    let template = (table === 'team') ? document.getElementById('team-subitem-template') : document.getElementById('subitem-template');
    if (!template || !currentParentRow) { addSubitemModal.hide(); return; }

    const clone = template.cloneNode(true);
    clone.id = '';
    clone.classList.remove('d-none');

    if (table === 'team') {
        const input = clone.querySelector('.sub-label-input');
        if (input) input.value = name;
        const scoreInput = clone.querySelector('.sub-score'); if (scoreInput) scoreInput.value = (maxVal ? Number(maxVal) : '');
        const comment = clone.querySelector('.sub-comment'); if (comment) comment.value = '';
    } else {
        // phases: always out of 10
        const label = clone.querySelector('.sub-label'); if (label) label.textContent = name;
        const maxSpan = clone.querySelector('.sub-max'); if (maxSpan) maxSpan.textContent = 10;
        const maxHidden = clone.querySelector('.sub-max-hidden'); if (maxHidden) maxHidden.value = 10;
        const score = clone.querySelector('.sub-score'); if (score) score.value = '';
        const comment = clone.querySelector('.sub-comment'); if (comment) comment.value = '';
    }

    currentParentRow.insertAdjacentElement('afterend', clone);
    addSubitemModal.hide();
    // trigger recalculation for the phase containing this subitem
    $(clone).find('.sub-score').trigger('input');
    recalcAllPhases();
});

// Remove subitem
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-subitem');
    if (!btn) return;
    const row = btn.closest('tr');
    if (row) row.remove();
    recalcAllPhases();
});

// Submit button: print team members' name and grade to console as JSON
document.getElementById('submitGrades').addEventListener('click', () => {
    const groupInput = document.getElementById('groupName');
    const group = groupInput ? groupInput.value.trim() : '';

    // only collect main team rows (not their subitem rows)
    const rows = document.querySelectorAll('#teamTable tbody tr.team-main-row');
    const members = [];
    rows.forEach(r => {
        const nameInput = r.querySelector('input[name="team_name[]"]');
        const name = nameInput ? nameInput.value.trim() : '';
        const gradeSpan = r.querySelector('.team-grade');
        const gradeText = gradeSpan ? gradeSpan.textContent.trim() : '';
        members.push({ name, grade: gradeText });
    });

    const output = { group, members };
    console.log(JSON.stringify(output, null, 2));
});

// --- Team fixed subitems management ---
function insertFixedTeamSubitems(mainRow) {
    // labels and maxima for the fixed subitems
    const items = [
        { label: 'Peer Review', max: 10 },
        { label: 'Sponsor Review', max: 10 },
        { label: 'Attendance', max: 20 }
    ];

    const template = document.getElementById('team-fixed-subitem-template');
    if (!template) return;

    // avoid inserting if fixed subitems already present immediately after this main row
    try {
        const nxt = $(mainRow).next();
        if (nxt.hasClass('team-fixed-sub') || nxt.hasClass('sub-header')) return;
    } catch (e) { /* ignore */ }

    // insert a header row (collapsed) for the subitems: Category | Grade | Maximum Grade
    const header = document.createElement('tr');
    header.className = 'sub-row sub-header d-none';
    header.innerHTML = `
        <td style="padding-left: 2rem;"><strong>Category</strong></td>
        <td><strong>Grade</strong></td>
        <td class="text-start align-middle"><strong>Maximum Grade</strong></td>
        <td class="text-start align-middle"><strong>Percentage</strong></td>
    `;
    insertAfter = mainRow;
    insertAfter.insertAdjacentElement('afterend', header);

    // insert each subitem sequentially after the header/main row
    let insertAfterRow = header;
    items.forEach(it => {
        const clone = template.cloneNode(true);
        clone.id = '';
        // keep fixed subitems collapsed/hidden by default
        clone.classList.add('d-none');
        // mark as fixed so we only count these when computing team grade
        clone.classList.add('team-fixed-sub');
        const label = clone.querySelector('.sub-label'); if (label) label.textContent = it.label;
    const maxSpan = clone.querySelector('.sub-max'); if (maxSpan) maxSpan.textContent = it.max;
    const maxHidden = clone.querySelector('.sub-max-hidden'); if (maxHidden) maxHidden.value = it.max;
    const pctSpan = clone.querySelector('.sub-pct'); if (pctSpan) pctSpan.textContent = '--';
        const scoreInput = clone.querySelector('.sub-score'); if (scoreInput) { scoreInput.value = ''; scoreInput.setAttribute('max', it.max); }
        insertAfterRow.insertAdjacentElement('afterend', clone);
        insertAfterRow = clone;
    });
    // after inserting, recalc the team grade for this main row
    try { recalcTeamGrade($(mainRow)); } catch (e) { /* ignore if recalc not yet defined */ }
}

function addTeamMember(name) {
    const tbody = document.querySelector('#teamTable tbody');
    const tr = document.createElement('tr');
    tr.className = 'main-row team-main-row';
    const safeName = String(name || '').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    tr.innerHTML = `
        <td><input type="text" name="team_name[]" class="form-control" placeholder="Student name" value="${safeName}"></td>
        <td class="align-middle"><span class="form-control-plaintext team-grade">--</span></td>
        <td><textarea name="team_comment[]" class="form-control" placeholder="Comments..." rows="2" style="resize:vertical;"></textarea></td>
        <td class="text-center align-middle">
            <div class="btn-group" role="group" aria-label="Actions">
                <button type="button" class="btn btn-sm btn-outline-secondary toggle-subitems" title="Show sub-items" aria-expanded="false">▾</button>
                <button type="button" class="btn btn-sm btn-danger remove-member" title="Remove member">✕</button>
            </div>
        </td>
    `;
    tbody.appendChild(tr);
    // create the three fixed subitems (Peer Review 10, Sponsor Review 10, Attendance 20)
    const fixedItems = [
        { label: 'Peer Review', max: 10 },
        { label: 'Sponsor Review', max: 10 },
        { label: 'Attendance', max: 20 }
    ];
    let insertAfter = tr;
    fixedItems.forEach(it => {
        const sub = document.createElement('tr');
        // create collapsed (hidden) subrows by default
        sub.className = 'sub-row team-fixed-sub d-none';
        sub.innerHTML = `
            <td style="padding-left: 2rem;"><div class="form-text small">⤷ <span class="sub-label">${it.label}</span></div></td>
            <td class="align-middle"><input type="number" class="form-control form-control-sm sub-score" min="0" step="0.01" placeholder="0"></td>
            <td class="text-start align-middle"><span class="form-control-plaintext small sub-max">${it.max}</span><input type="hidden" class="sub-max-hidden" value="${it.max}"></td>
            <td class="text-start align-middle"><span class="form-control-plaintext small sub-pct">--</span></td>
        `;
        insertAfter.insertAdjacentElement('afterend', sub);
        insertAfter = sub;
    });
    try { recalcTeamGrade($(tr)); } catch (e) {}
}

// Toggle subitems visibility for a team member (expand/collapse)
$(document).on('click', '.toggle-subitems', function () {
    const btn = $(this);
    const main = btn.closest('tr.team-main-row');
    if (!main || !main.length) return;
    // iterate following rows that are sub-rows until next main row
    let next = main.next();
    let anyHidden = false;
    // determine desired action: if first sub-row is hidden, we'll show; otherwise hide
    if (next.length && next.hasClass('sub-row')) {
        anyHidden = next.hasClass('d-none');
    }
    while (next.length && next.hasClass('sub-row')) {
        if (anyHidden) next.removeClass('d-none'); else next.addClass('d-none');
        next = next.next();
    }
    // flip arrow and aria-expanded
    if (anyHidden) {
        btn.text('▴');
        btn.attr('aria-expanded', 'true');
        btn.attr('title', 'Hide sub-items');
    } else {
        btn.text('▾');
        btn.attr('aria-expanded', 'false');
        btn.attr('title', 'Show sub-items');
    }
    // ensure grade is up-to-date when expanded
    try { recalcTeamGrade(main); } catch (e) {}
});

// initialize: add fixed subitems for existing team main rows
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#teamTable tbody tr.team-main-row').forEach(r => insertFixedTeamSubitems(r));

    // wire up Add Team Member modal + button
    const addBtn = document.getElementById('addTeamMemberBtn');
    const addModalEl = document.getElementById('addTeamMemberModal');
    if (addBtn && addModalEl) {
        const addModal = new bootstrap.Modal(addModalEl);
        addBtn.addEventListener('click', () => {
            document.getElementById('newTeamMemberName').value = '';
            addModal.show();
        });

        document.getElementById('addTeamMemberForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('newTeamMemberName').value.trim() || 'New Student';
            addTeamMember(name);
            addModal.hide();
        });
    }
    // initial group subtotal calc
    try { recalcGroupSubtotal(); } catch (e) {}
});

// Recalculate a single team member's grade (weighted sum out of total max -> percentage)
function recalcTeamGrade(mainRow) {
    if (!mainRow || mainRow.length === 0) return;
    const main = $(mainRow);
    let next = main.next();
    let sum = 0;
    let totalMax = 0;
    while (next.length && next.hasClass('sub-row')) {
        // only consider fixed team subitems we created
        if (!next.hasClass('team-fixed-sub')) { next = next.next(); continue; }
        const scoreInput = next.find('.sub-score');
        const maxHidden = next.find('.sub-max-hidden');
        let v = parseFloat(scoreInput.val());
        if (!isFinite(v)) v = 0;
        let m = parseFloat(maxHidden.val());
        if (!isFinite(m)) {
            // try attribute
            m = parseFloat(scoreInput.attr('max')) || 0;
        }
        sum += v;
        totalMax += (isFinite(m) ? m : 0);
        next = next.next();
    }

    const gradeSpan = main.find('.team-grade');
    if (!totalMax || totalMax <= 0) {
        gradeSpan.text('--');
        // still compute final as '--'
        main.find('.team-final').text('--');
        return;
    }
    // display raw sum out of the total max (e.g. "32 / 40")
    const display = Number(sum.toFixed(2)) + ' / ' + Number(totalMax);
    gradeSpan.text(display);

    // compute final grade:
    // Assumption: final = individual_sum + (groupPct/100 * 40) * (attendance_raw / attendance_max)
    // - groupPct comes from group subtotal average (0-100)
    // - we scale group contribution to a 40-point scale, then multiply by attendance fraction (0-1)
    let attendanceRaw = 0, attendanceMax = 0;
    // find attendance subrow among following sub-rows
    let scan = main.next();
    while (scan.length && scan.hasClass('sub-row')) {
        try {
            const label = (scan.find('.sub-label').text() || '').trim();
            if (label.toLowerCase().includes('attendance')) {
                const v = parseFloat(scan.find('.sub-score').val()); if (isFinite(v)) attendanceRaw = v;
                const m = parseFloat(scan.find('.sub-max-hidden').val()); if (isFinite(m)) attendanceMax = m;
                // also check visible max input if present
                if (!isFinite(attendanceMax)) {
                    const mv = parseFloat(scan.find('.sub-max-input').val()); if (isFinite(mv)) attendanceMax = mv;
                }
                break;
            }
        } catch (e) { /* ignore */ }
        scan = scan.next();
    }

    const groupEl = $('#groupSubtotalValue');
    let groupPct = parseFloat(groupEl.data('pct'));
    if (!isFinite(groupPct)) {
        const parsed = parseFloat(groupEl.text()); groupPct = isFinite(parsed) ? parsed : 0;
    }
    const groupPoints = (groupPct / 100) * 40; // scale to 40-point contribution
    let groupContribution = 0;
    if (attendanceMax && attendanceMax > 0) {
        groupContribution = groupPoints * (attendanceRaw / attendanceMax);
    }
    const finalVal = Number((sum + groupContribution).toFixed(2));
    main.find('.team-final').text(finalVal);
}

// live update when any team sub-score changes
$(document).on('input', '#teamTable .sub-score', function() {
    const tr = $(this).closest('tr');
    // find the parent main row (the nearest preceding .team-main-row)
    const main = tr.prevAll('tr.team-main-row').first();
    // update this subitem's percentage display
    updateSubitemPercentage(tr);
    if (main && main.length) recalcTeamGrade(main);
});

// update percentage for a subitem row (score / max)
function updateSubitemPercentage(subRow) {
    try {
        const r = $(subRow);
        const scoreInput = r.find('.sub-score');
        const maxHidden = r.find('.sub-max-hidden');
        let v = parseFloat(scoreInput.val()); if (!isFinite(v)) { r.find('.sub-pct').text('--'); return; }
        let m = parseFloat(maxHidden.val());
        if (!isFinite(m)) {
            // try a visible max input (for arbitrary team subitems)
            m = parseFloat(r.find('.sub-max-input').val());
        }
        if (!isFinite(m) || m === 0) { r.find('.sub-pct').text('--'); return; }
        const pct = (v / m) * 100;
        r.find('.sub-pct').text(Number(pct.toFixed(2)) + '%');
    } catch (e) { /* ignore */ }
}

// Remove a team member (main row + any following sub-rows)
$(document).on('click', '.remove-member', function() {
    const btn = $(this);
    const main = btn.closest('tr.team-main-row');
    if (!main || !main.length) return;
    // remove following sub-rows until next main row
    let next = main.next();
    while (next.length && next.hasClass('sub-row')) {
        const toRemove = next;
        next = next.next();
        toRemove.remove();
    }
    main.remove();
});

// Recalculate group subtotal: average percentage across all phase main rows
function recalcGroupSubtotal() {
    const phaseRows = $('#gradesForm table').first().find('tr.main-row');
    let sumPct = 0;
    let count = 0;
    phaseRows.each(function() {
        const r = $(this);
        const scoreVal = parseFloat(r.find('.phase-score-hidden').val());
        const maxVal = parseFloat(r.find('input[name="max[]"]').val());
        if (!isFinite(maxVal) || maxVal === 0) return; // skip
        const s = isFinite(scoreVal) ? scoreVal : 0;
        const pct = (s / maxVal) * 100;
        sumPct += pct;
        count += 1;
    });

    const outEl = $('#groupSubtotalValue');
    if (count === 0) { outEl.text('--'); return; }
    const avg = sumPct / count;
    outEl.text(Number(avg.toFixed(2)) + '%');
    // store numeric pct for other calculations
    outEl.data('pct', Number(avg));
    // update all team final grades since group pct changed
    try { $('#teamTable tbody tr.team-main-row').each(function() { recalcTeamGrade($(this)); }); } catch (e) {}
}

// Recalculate phase scores: average of subcategory scores (each out of 10), scaled to phase max (e.g., 40)
function recalcAllPhases() {
    // for each main phase row, find following sibling sub-rows until next main row
    // find main rows only in the first table inside the form (phases table)
    const phasesMainRows = $('#gradesForm table').first().find('tr.main-row');
    phasesMainRows.each(function () {
        const main = $(this);
                let subRows = [];
                let next = main.next();
                while (next.length && next.hasClass('sub-row')) {
                    // skip hidden template rows (they have d-none)
                    if (!next.hasClass('d-none')) subRows.push(next);
                    next = next.next();
                }

        if (subRows.length === 0) {
            // no subitems => phase score 0
            main.find('.phase-score').text('--');
            main.find('.phase-score-hidden').val('');
            return;
        }

        // sum sub-scores (treat empty as 0)
        let sum = 0;
        let count = 0;
        subRows.forEach(r => {
            const v = parseFloat(r.find('.sub-score').val());
            if (isFinite(v)) { sum += v; }
            count += 1;
        });

        const avg = (count > 0) ? (sum / count) : 0; // average out of 10
        // scale to phase max
        const phaseMax = parseFloat(main.find('input[name="max[]"]').val()) || 40;
    const phaseScore = (avg / 10) * phaseMax;
    const phaseScoreNum = Number(phaseScore.toFixed(2));
    // show as raw score out of max (e.g. "32.00 / 40") while keeping hidden numeric value for calculations
    const displayStr = phaseScoreNum + ' / ' + Number(phaseMax);
    main.find('.phase-score').text(displayStr);
    main.find('.phase-score-hidden').val(phaseScoreNum);
    });
    // update group subtotal after recalculating all phases
    try { recalcGroupSubtotal(); } catch (e) { /* ignore if not available */ }
}

// Recalculate when any sub-score input changes
$(document).on('input', '.sub-score', function () {
    const tbl = $(this).closest('table');
    if (!tbl.length) return;
    // only react if this is the first table (phases)
    const firstTable = $('#gradesForm table').first()[0];
    if (tbl[0] !== firstTable) return;
    recalcAllPhases();
});