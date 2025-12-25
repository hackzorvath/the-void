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

    const rows = document.querySelectorAll('#teamTable tbody tr');
    const members = [];
    rows.forEach(r => {
        // skip template rows
        if (r.id && r.id.includes('template')) return;
        const nameInput = r.querySelector('input[name="team_name[]"]');
        const name = nameInput ? nameInput.value.trim() : '';
        const gradeSpan = r.querySelector('.team-grade');
        const gradeText = gradeSpan ? gradeSpan.textContent.trim() : '';
        members.push({ name, grade: gradeText });
    });

    const output = { group, members };
    console.log(JSON.stringify(output, null, 2));
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