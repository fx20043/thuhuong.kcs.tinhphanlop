let lastFocusedInput = null;

// Track the last focused input
document.addEventListener('focusin', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    lastFocusedInput = e.target;
  }
});

// Restore focus when tab becomes active again
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && lastFocusedInput) {
    lastFocusedInput.focus();
    // Optionally move the cursor to the end
    const val = lastFocusedInput.value;
    lastFocusedInput.value = ''; // Reset and restore to move cursor
    lastFocusedInput.value = val;
  }
});

function processEach(n, e) {
  const map = group([...n], parseFloat(e));
  const processedList = new Array(n.length);

  for (let m = 0; m < processedList.length; m++) {
    processedList[m] = `${n[m]} ${map.get(parseFloat(n[m]))}`;
  }

  return processedList;
}

function group(n, e) {
  n = n.map(x => parseFloat(x));
  n.sort((a, b) => a - b);
  reverse(n);

  const result = new Array(n.length).fill("");

  const groups = ["a", "b", "c", "d"];
  let groupCount = 0;
  let groupName = groups[groupCount];
  let i = 0;

  while (i < n.length) {
    let limit = n[i] - e;
    while (i < n.length && n[i] >= limit) {
      result[i] += groupName;
      i++;
    }
    if (i === n.length) break;

    groupName = groups[++groupCount % groups.length];
    let begin = n[i] + e;
    let a = i - 1;
    while (a >= 0 && n[a] <= begin) {
      a--;
    }
    i = a + 1;
  }

  const resultGroup = new Map();
  for (let k = 0; k < n.length; k++) {
    resultGroup.set(n[k], result[k]);
  }

  return resultGroup;
}

function reverse(arr) {
  let n = arr.length;
  for (let i = 0; i < Math.floor(n / 2); i++) {
    let temp = arr[i];
    arr[i] = arr[n - i - 1];
    arr[n - i - 1] = temp;
  }
}

function parseCell(cell) {
  const cleaned = cell.trim().replace(',', '.');
  const match = cleaned.match(/^(-?\d+(?:\.\d+)?)(\s*\D.*)?$/);
  if (match) {
    return {
      num: parseFloat(match[1]),
      str: (match[2] || '').trim()
    };
  } else {
    return { num: null, str: cleaned };
  }
}

function parseExcelText(text) {
  return text.trim().split('\n').map(row => row.split('\t'));
}

function updateManipulationInputs() {
  const data = parseExcelText(document.getElementById('input1').value);
  const container = document.getElementById('manipulationInputs');
  container.innerHTML = '';

  if (data.length === 0 || data[0].length === 0) return;

  const maxCols = Math.max(...data.map(row => row.length));

  for (let i = 0; i < maxCols; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Col ${i + 1}`;
    input.dataset.col = i;
    container.appendChild(input);
  }
}

function getManipulationValues() {
  const inputs = document.querySelectorAll('#manipulationInputs input');
  const values = [];

  for (const input of inputs) {
    const raw = input.value.trim().replace(',', '.');
    if (raw === '' || isNaN(parseFloat(raw))) {
      alert("Please fill in all LSD values!");
      input.focus();
      return null;
    }
    values.push(parseFloat(raw));
  }

  return values;
}

function transpose(matrix) {
  const rows = matrix.length;
  const cols = Math.max(...matrix.map(row => row.length));
  const transposed = Array.from({ length: cols }, () => Array(rows).fill(""));

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      transposed[j][i] = matrix[i][j];
    }
  }

  return transposed;
}

function validateExcelData(data) {
  for (let row = 0; row < data.length; row++) {
    for (let col = 0; col < data[row].length; col++) {
      const cell = data[row][col].trim();
      if (cell === '') {
        alert(`Empty cell at row ${row + 1}, column ${col + 1}. Please fill all cells.`);
        return false;
      }

      const normalized = cell.replace(',', '.');
      const match = normalized.match(/^(-?\d+(\.\d+)?)(\s*\D.*)?$/);
      if (!match) {
        alert(`Invalid format in cell at row ${row + 1}, column ${col + 1}. It must start with a number.`);
        return false;
      }
    }
  }
  return true;
}

function compareTables() {
  const raw1 = parseExcelText(document.getElementById('input1').value);
  if (!validateExcelData(raw1)) return;

  const raw2 = parseExcelText(document.getElementById('input2').value);
  const values = getManipulationValues();
  if (!values) return;

  const transposed = transpose(raw1);
  const cleanedCols = transposed.map(col => col.map(cell => parseCell(cell).num));
  const manipulatedCols = cleanedCols.map((col, i) => processEach(col, values[i] ?? '0'));
  const manipulatedRows = transpose(manipulatedCols);

  const maxRows = Math.max(manipulatedRows.length, raw2.length);
  const maxCols = Math.max(...[...manipulatedRows, ...raw2].map(row => row.length));
  const diffs = Array.from({ length: maxRows }, () => Array(maxCols).fill(false));

  for (let i = 0; i < maxRows; i++) {
    for (let j = 0; j < maxCols; j++) {
      const val1 = manipulatedRows[i]?.[j] ?? '';
      const val2 = raw2[i]?.[j] ?? '';
      const p1 = parseCell(val1);
      const p2 = parseCell(val2);
      if (p1.num !== null && p2.num !== null) {
        if (p1.num !== p2.num || p1.str !== p2.str) {
          diffs[i][j] = true;
        }
      } else {
        if (val1.trim() !== val2.trim()) {
          diffs[i][j] = true;
        }
      }
    }
  }

  renderTable(document.getElementById('table1'), manipulatedRows, diffs, "Excel");
  renderTable(document.getElementById('table2'), raw2, diffs, "Word");
}

function renderTable(container, data, diffs, title) {
  const wrapper = document.createElement('div');

  const heading = document.createElement('h3');
  heading.textContent = title;
  heading.className = 'table-title';
  wrapper.appendChild(heading);

  const table = document.createElement('table');
  data.forEach((row, i) => {
    const tr = document.createElement('tr');
    row.forEach((cell, j) => {
      const td = document.createElement('td');
      td.textContent = cell;
      if (diffs && diffs[i] && diffs[i][j]) {
        td.classList.add('different');
      }
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  wrapper.appendChild(table);
  container.innerHTML = '';
  container.appendChild(wrapper);
}

function clearAll() {
  document.getElementById('input1').value = '';
  document.getElementById('input2').value = '';
  document.getElementById('manipulationInputs').innerHTML = '';
  document.getElementById('table1').innerHTML = '';
  document.getElementById('table2').innerHTML = '';
}
