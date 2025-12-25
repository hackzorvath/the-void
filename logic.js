// helper: append a new row to the table body
function appendRow(itemName, maxValue) {
    const tbody = document.querySelector('table tbody');
    const tr = document.createElement('tr');
    // escape simple text for safety
    const safeName = String(itemName).replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    tr.innerHTML = `
                <td><div class="form-text">${safeName}</div></td>
                <td class="align-middle"><span class="form-control-plaintext phase-score">--</span><input type="hidden" name="score[]" class="phase-score-hidden" value=""></td>
                <td class="align-middle"><span class="form-control-plaintext">${Number(maxValue)}</span><input type="hidden" name="max[]" value="${Number(maxValue)}"></td>
                <td><input type="text" name="comment[]" class="form-control" placeholder="Comments..."></td>
                <td class="text-center align-middle"><button type="button" class="btn btn-sm btn-outline-secondary add-subitem" data-table="phases">▾</button></td>
            `;
    tbody.appendChild(tr);
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
        if ($(mainRow).next().hasClass('team-fixed-sub')) return;
    } catch (e) { /* ignore */ }

    // insert each subitem sequentially after the main row
    let insertAfter = mainRow;
    items.forEach(it => {
        const clone = template.cloneNode(true);
        clone.id = '';
        clone.classList.remove('d-none');
        // mark as fixed so we only count these when computing team grade
        clone.classList.add('team-fixed-sub');
        const label = clone.querySelector('.sub-label'); if (label) label.textContent = it.label;
        const maxSpan = clone.querySelector('.sub-max'); if (maxSpan) maxSpan.textContent = it.max;
        const maxHidden = clone.querySelector('.sub-max-hidden'); if (maxHidden) maxHidden.value = it.max;
        const scoreInput = clone.querySelector('.sub-score'); if (scoreInput) { scoreInput.value = ''; scoreInput.setAttribute('max', it.max); }
        insertAfter.insertAdjacentElement('afterend', clone);
        insertAfter = clone;
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
        <td class="text-center align-middle"></td>
    `;
    tbody.appendChild(tr);
    insertFixedTeamSubitems(tr);
}

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
        return;
    }
    const pct = (sum / totalMax) * 100;
    const display = Number(pct.toFixed(2)) + '%';
    gradeSpan.text(display);
}

// live update when any team sub-score changes
$(document).on('input', '#teamTable .sub-score', function() {
    const tr = $(this).closest('tr');
    // find the parent main row (the nearest preceding .team-main-row)
    const main = tr.prevAll('tr.team-main-row').first();
    if (main && main.length) recalcTeamGrade(main);
});

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
            subRows.push(next);
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
        const display = Number((phaseScore).toFixed(2));
        main.find('.phase-score').text(display);
        main.find('.phase-score-hidden').val(display);
    });
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