const teams = ['SITI', 'IRA', 'EKIN', 'BALQIS'];

const SHIFT_LABELS = {
  morning: 'Morning',
  evening: 'Evening',
  night: 'Night',
  off: 'Off',
  rest: 'Rest'
};

// clamp range for display
const MIN_MONTH = new Date(2026, 0, 1);
// Jan 2026
const MAX_MONTH = new Date(2026, 11, 1);
// Dec 2026

function clampMonth(date) {
  // normalize to first of month
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  if (d < MIN_MONTH)
    return new Date(MIN_MONTH);
  if (d > MAX_MONTH)
    return new Date(MAX_MONTH);
  return d;
}

// start with current month but clamp into 2026 range
let currentDate = clampMonth(new Date());

const grid = document.getElementById('calendarGrid');
const label = document.getElementById('monthLabel');

// active filter set - start with ALL teams selected by default
const activeTeams = new Set(teams);

// --- NEW: scheduling rules anchored at 1 Jan 2026 ---
const START_DATE = new Date(2026, 0, 1);
// Jan 1, 2026

// work cycle positions (1..8): Day1..Day6, Off (7), Rest (8)
const CYCLE_LENGTH = 8;

// shift block order -- each block is 8 days (6 work + 2 off)
const SHIFT_ORDER = ['morning', 'night', 'evening'];

// initial state on 1 Jan 2026 as supplied
const initialState = {
  'SITI': {
    shift: 'evening',
    cycleIndex: 5
  },
  // Day 5
  'IRA': {
    shift: 'night',
    cycleIndex: 7
  },
  // <-- changed to 'night' to match provided daily sequence
  'EKIN': {
    shift: 'morning',
    cycleIndex: 3
  },
  // Day 3
  'BALQIS': {
    shift: 'night',
    cycleIndex: 1
  }// Day 1
};

// helper: compute assignment for a person on a given date
function computeAssignment(person, date) {
  const init = initialState[person];
  if (!init)
    return {
      shift: 'morning',
      cycleIndex: 1
    };

  // normalize to UTC midnight (do not mutate inputs)
  const dUTC = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const sUTC = Date.UTC(START_DATE.getFullYear(), START_DATE.getMonth(), START_DATE.getDate());

  const diffDays = Math.floor((dUTC - sUTC) / (1000 * 60 * 60 * 24));

  // zero-based initial position in 8-day cycle
  const startPos = init.cycleIndex - 1;
  const overallPos = startPos + diffDays;

  // cycle index 1..8 (safe modulo for negatives)
  const mod = ((overallPos % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH;
  const cycleIndex = mod + 1;

  // number of completed 8-day blocks since start (can be negative)
  const completedBlocks = Math.floor((startPos + diffDays) / CYCLE_LENGTH);

  // initial shift block index (map shift to SHIFT_ORDER index)
  const initialShiftIndex = SHIFT_ORDER.indexOf(init.shift);
  const shiftIndex = ((initialShiftIndex + completedBlocks) % SHIFT_ORDER.length + SHIFT_ORDER.length) % SHIFT_ORDER.length;
  const shift = (cycleIndex === 7) ? 'off' : (cycleIndex === 8) ? 'rest' : SHIFT_ORDER[shiftIndex];

  return {
    shift,
    cycleIndex
  };
}

// create filter pills in header (left side)
function createFilterPills() {
  const header = document.querySelector('.header');
  const container = document.createElement('div');
  container.className = 'filters';

  // Add "All" button first
  const allBtn = document.createElement('button');
  allBtn.className = 'filter-pill active';
  allBtn.type = 'button';
  allBtn.dataset.name = 'ALL';
  allBtn.textContent = 'All';

  allBtn.addEventListener('click', () => {
    const allActive = activeTeams.size === teams.length;

    if (allActive) {
      // Deselect all
      activeTeams.clear();
      allBtn.classList.remove('active');
      container.querySelectorAll('.filter-pill:not([data-name="ALL"])').forEach(btn => {
        btn.classList.remove('active');
      }
      );
    } else {
      // Select all
      teams.forEach(t => activeTeams.add(t));
      allBtn.classList.add('active');
      container.querySelectorAll('.filter-pill:not([data-name="ALL"])').forEach(btn => {
        btn.classList.add('active');
      }
      );
    }
    renderCalendar();
  }
  );

  container.appendChild(allBtn);

  teams.forEach(t => {
    const btn = document.createElement('button');
    // start WITH 'active' class so all buttons are active by default
    btn.className = 'filter-pill active';
    btn.type = 'button';
    btn.dataset.name = t;

    // label text only
    btn.textContent = t;

    // button click toggles filter state
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      if (activeTeams.has(name)) {
        activeTeams.delete(name);
        btn.classList.remove('active');
      } else {
        activeTeams.add(name);
        btn.classList.add('active');
      }

      // Update "All" button state
      const allBtn = container.querySelector('[data-name="ALL"]');
      if (activeTeams.size === teams.length) {
        allBtn.classList.add('active');
      } else {
        allBtn.classList.remove('active');
      }

      renderCalendar();
    }
    );

    container.appendChild(btn);
  }
  );

  // insert filters at start of header
  header.prepend(container);
}

function renderCalendar() {
  grid.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  label.textContent = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  // render weekday names first
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayNames.forEach(d => {
    const dn = document.createElement('div');
    dn.className = 'day-name';
    dn.textContent = d;
    grid.appendChild(dn);
  }
  );

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement('div'));
  }

  // if no teams selected (empty set), show all teams
  const teamsToShow = activeTeams.size === 0 ? teams : Array.from(activeTeams);

  for (let d = 1; d <= daysInMonth; d++) {
    const dayWrapper = document.createElement('div');
    dayWrapper.className = 'day-wrapper';

    const date = document.createElement('div');
    date.className = 'date';
    date.textContent = d;
    dayWrapper.appendChild(date);

    const day = document.createElement('div');
    day.className = 'day';

    teams.forEach(name => {
      // skip rendering person if NOT in teamsToShow
      if (!teamsToShow.includes(name))
        return;

      const person = document.createElement('div');
      person.className = 'person';

      const namePill = document.createElement('span');
      namePill.className = 'name-pill';
      namePill.textContent = name;

      // compute assignment for this person/date
      const assignDate = new Date(year, month, d);
      const assign = computeAssignment(name, new Date(assignDate));
      // pass copy

      const shiftPill = document.createElement('span');
      shiftPill.className = 'shift-pill ' + assign.shift;
      shiftPill.textContent = SHIFT_LABELS[assign.shift] ?? assign.shift;
      let idxMap = {
        morning: 0,
        evening: 1,
        night: 2,
        rest: 3,
        off: 4
      };
      shiftPill.dataset.index = idxMap[assign.shift] ?? 0;

      // show work cycle pill ONLY for Day 1..6; do NOT show for Off(7) or Rest(8)
      if (assign.cycleIndex >= 1 && assign.cycleIndex <= 6) {
        const workCycle = document.createElement('span');
        workCycle.className = 'work-cycle-label';
        workCycle.textContent = 'D' + assign.cycleIndex;
        workCycle.dataset.cycle = assign.cycleIndex;
        person.appendChild(namePill);
        person.appendChild(shiftPill);
        person.appendChild(workCycle);
      } else {
        // Off / Rest: only show shift pill (no work cycle pill)
        person.appendChild(namePill);
        person.appendChild(shiftPill);
      }

      day.appendChild(person);
    }
    );

    dayWrapper.appendChild(day);
    grid.appendChild(dayWrapper);
  }
}

document.getElementById('prevMonth').onclick = () => {
  const candidate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  if (candidate < MIN_MONTH) {
    currentDate = new Date(MAX_MONTH);
    // wrap to December 2026
  } else {
    currentDate = clampMonth(candidate);
  }
  renderCalendar();
}
  ;

document.getElementById('nextMonth').onclick = () => {
  const candidate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  if (candidate > MAX_MONTH) {
    currentDate = new Date(MIN_MONTH);
    // wrap to January 2026
  } else {
    currentDate = clampMonth(candidate);
  }
  renderCalendar();
}
 ;

// init
createFilterPills();
renderCalendar();

// ===== Download Modal Functionality =====
const modal = document.getElementById('downloadModal');
const downloadBtn = document.getElementById('downloadBtn');
const cancelDownload = document.getElementById('cancelDownload');
const confirmDownload = document.getElementById('confirmDownload');
const personFilters = document.getElementById('personFilters');
const monthFilters = document.getElementById('monthFilters');

// selected filters for download
const downloadSelection = {
  persons: new Set(),
  months: new Set()
};

// make Next disabled by default
confirmDownload.disabled = true;

// helper to enable/disable Next button
function updateConfirmState() {
  const ok = downloadSelection.persons.size > 0 && downloadSelection.months.size > 0;
  confirmDownload.disabled = !ok;
}

// open modal when download button clicked
downloadBtn.addEventListener('click', () => {
  // reset selections
  downloadSelection.persons.clear();
  downloadSelection.months.clear();
  confirmDownload.disabled = true;

  // populate person filters
  personFilters.innerHTML = '';

  // Add "All" button for persons
  const allPersonBtn = document.createElement('button');
  allPersonBtn.className = 'modal-filter-pill';
  allPersonBtn.textContent = 'All';
  allPersonBtn.dataset.person = 'ALL';

  allPersonBtn.addEventListener('click', () => {
    const allActive = downloadSelection.persons.size === teams.length;

    if (allActive) {
      // Deselect all
      downloadSelection.persons.clear();
      allPersonBtn.classList.remove('active');
      personFilters.querySelectorAll('.modal-filter-pill:not([data-person="ALL"])').forEach(pill => {
        pill.classList.remove('active');
      });
    } else {
      // Select all
      teams.forEach(t => downloadSelection.persons.add(t));
      allPersonBtn.classList.add('active');
      personFilters.querySelectorAll('.modal-filter-pill:not([data-person="ALL"])').forEach(pill => {
        pill.classList.add('active');
      });
    }
    updateConfirmState();
  });

  personFilters.appendChild(allPersonBtn);

  teams.forEach(person => {
    const pill = document.createElement('button');
    pill.className = 'modal-filter-pill';
    pill.textContent = person;
    pill.dataset.person = person;

    pill.addEventListener('click', () => {
      if (downloadSelection.persons.has(person)) {
        downloadSelection.persons.delete(person);
        pill.classList.remove('active');
      } else {
        downloadSelection.persons.add(person);
        pill.classList.add('active');
      }

      // Update "All" button state
      const allBtn = personFilters.querySelector('[data-person="ALL"]');
      if (downloadSelection.persons.size === teams.length) {
        allBtn.classList.add('active');
      } else {
        allBtn.classList.remove('active');
      }

      updateConfirmState();
    });

    personFilters.appendChild(pill);
  });

  // populate month filters (Jan - Dec 2026)
  monthFilters.innerHTML = '';
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Add "All" button for months
  const allMonthBtn = document.createElement('button');
  allMonthBtn.className = 'modal-filter-pill';
  allMonthBtn.textContent = 'All';
  allMonthBtn.dataset.month = 'ALL';

  allMonthBtn.addEventListener('click', () => {
    const allActive = downloadSelection.months.size === 12;

    if (allActive) {
      // Deselect all
      downloadSelection.months.clear();
      allMonthBtn.classList.remove('active');
      monthFilters.querySelectorAll('.modal-filter-pill:not([data-month="ALL"])').forEach(pill => {
        pill.classList.remove('active');
      });
    } else {
      // Select all
      months.forEach((_, index) => downloadSelection.months.add(index));
      allMonthBtn.classList.add('active');
      monthFilters.querySelectorAll('.modal-filter-pill:not([data-month="ALL"])').forEach(pill => {
        pill.classList.add('active');
      });
    }
    updateConfirmState();
  });

  monthFilters.appendChild(allMonthBtn);

  months.forEach((monthName, index) => {
    const pill = document.createElement('button');
    pill.className = 'modal-filter-pill';
    pill.textContent = monthName;
    pill.dataset.month = index;

    pill.addEventListener('click', () => {
      if (downloadSelection.months.has(index)) {
        downloadSelection.months.delete(index);
        pill.classList.remove('active');
      } else {
        downloadSelection.months.add(index);
        pill.classList.add('active');
      }

      // Update "All" button state
      const allBtn = monthFilters.querySelector('[data-month="ALL"]');
      if (downloadSelection.months.size === 12) {
        allBtn.classList.add('active');
      } else {
        allBtn.classList.remove('active');
      }

      updateConfirmState();
    });

    monthFilters.appendChild(pill);
  });

  modal.classList.add('show');
}
);

// close modal handlers
cancelDownload.addEventListener('click', () => {
  modal.classList.remove('show');
}
);

// confirm download handler (now generates images then shows preview modal)
confirmDownload.addEventListener('click', async () => {
  // Disable button and show loading
  const originalText = confirmDownload.textContent;
  confirmDownload.disabled = true;
  confirmDownload.textContent = 'Loading';

  // Block all interactions except cancel button
  const modalContent = modal.querySelector('.modal-content');
  modalContent.style.pointerEvents = 'none';
  cancelDownload.style.pointerEvents = 'auto';
  cancelDownload.style.cursor = 'pointer';

  // Block clicking outside modal (backdrop click)
  modal.style.pointerEvents = 'none';
  cancelDownload.parentElement.style.pointerEvents = 'auto';
  // re-enable footer for cancel button

  // Flag to track if user cancelled
  let isCancelled = false;

  // Cancel handler - set flag and cleanup
  const cancelHandler = () => {
    isCancelled = true;
  }
    ;

  // Add one-time cancel listener
  cancelDownload.addEventListener('click', cancelHandler, {
    once: true
  });

  // Add loading animation
  let dots = 0;
  const loadingInterval = setInterval(() => {
    dots = (dots + 1) % 4;
    confirmDownload.textContent = 'Loading' + '.'.repeat(dots);
  }
    , 300);

  try {
    // collect selected months in ascending order
    const monthsArray = Array.from(downloadSelection.months).sort((a, b) => a - b);
    if (monthsArray.length === 0) {
      clearInterval(loadingInterval);
      confirmDownload.textContent = originalText;
      confirmDownload.disabled = false;
      modalContent.style.pointerEvents = 'auto';
      modal.style.pointerEvents = 'auto';
      cancelDownload.removeEventListener('click', cancelHandler);
      return;
    }

    // use fixed 6 rows (7 columns x 6 rows)
    const maxRows = 6;

    // collect generated images in ascending month order
    const images = [];
    for (const monthIndex of monthsArray) {
      // Check if cancelled before processing each month
      if (isCancelled) {
        console.log('Image generation cancelled by user');
        break;
      }

      const result = await generateCalendarImage(monthIndex, downloadSelection.persons, maxRows);
      images.push(result);
    }

    // Clear loading animation
    clearInterval(loadingInterval);
    confirmDownload.textContent = originalText;

    // If cancelled, just cleanup and close modal
    if (isCancelled) {
      confirmDownload.disabled = false;
      modalContent.style.pointerEvents = 'auto';
      modal.style.pointerEvents = 'auto';
      modal.classList.remove('show');
      return;
    }

    if (images.length === 0) {
      confirmDownload.disabled = false;
      modalContent.style.pointerEvents = 'auto';
      modal.style.pointerEvents = 'auto';
      cancelDownload.removeEventListener('click', cancelHandler);
      return;
    }

    // close selection modal
    modal.classList.remove('show');

    // Reset button state and re-enable interactions
    confirmDownload.disabled = false;
    modalContent.style.pointerEvents = 'auto';
    modal.style.pointerEvents = 'auto';

    openPreviewModal(images);
  } catch (error) {
    // Handle error
    clearInterval(loadingInterval);
    confirmDownload.textContent = originalText;
    confirmDownload.disabled = false;
    modalContent.style.pointerEvents = 'auto';
    modal.style.pointerEvents = 'auto';
    cancelDownload.removeEventListener('click', cancelHandler);
    console.error('Error generating calendar images:', error);
  } finally {
    // Always remove the cancel listener when done
    cancelDownload.removeEventListener('click', cancelHandler);
  }
}
);

// generateCalendarImage now accepts optional maxRows to force uniform row height
async function generateCalendarImage(monthIndex, selectedPersons, maxRows) {
  // Scaling factor for saved images
  const SCALE = 3.8;

  // A4 Landscape dimensions at 300 DPI
  const A4_WIDTH = 3508;
  const A4_HEIGHT = 2480;

  // Create style element for export-specific scaling
  const styleEl = document.createElement('style');
  styleEl.id = 'export-styles';
  styleEl.textContent = `
        :root {
          --morning-color: #0369a1;
          --evening-color: #b91c1c;
          --night-color: #5f6f82;
          --off-color: antiquewhite;
          --rest-color: antiquewhite;
          --border-style: ${2 * SCALE}px solid var(--night-color);
        }

        .export-container {
          position: absolute;
          left: -9999px;
          width: ${A4_WIDTH}px;
          height: ${A4_HEIGHT}px;
          background: white;
          box-sizing: border-box;
          font-family: "Google Sans", sans-serif;
          overflow: hidden;
        }
        
        .export-calendar {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: white;
          box-sizing: border-box;
        }
        
        .export-title-block {
          text-align: center;
          flex-shrink: 0;
        }
        
        .export-title {
          margin: 0;
          font-size: ${16 * SCALE}px;
          font-weight: 600;
          font-family: "Google Sans", sans-serif;
          color: black;
          padding-bottom: ${6 * SCALE}px;
        }
        
        .export-grid-container {
          flex: 1;
          overflow: hidden;
          min-height: 0;
          box-sizing: border-box;
        }
        
        .export-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          grid-template-rows: auto repeat(6, 1fr);
          gap: ${6 * SCALE}px;
          height: 100%;
          width: 100%;
          box-sizing: border-box;
        }
        
        .export-day-name {
          font-size: ${13 * SCALE}px;
          font-weight: 600;
          text-align: center;
          background: transparent;
          border-bottom: var(--border-style);
          font-family: "Google Sans", sans-serif;
          color: black;
          box-sizing: border-box;
        }
        
        .export-day-wrapper {
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 0;
          box-sizing: border-box;
        }
        
        .export-date {
          font-size: ${12 * SCALE}px;
          font-weight: 600;
          text-align: center;
          color: black;
          font-family: "Google Sans", sans-serif;
          flex-shrink: 0;
        }
        
        .export-day {
          flex: 1;
          background: white;
          border: var(--border-style);
          border-radius: ${6 * SCALE}px;
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 0;
          padding: ${6 * SCALE}px ${6 * SCALE}px 0 ${6 * SCALE}px;
        }
        
        .export-person {
          align-items: center;
          display: flex;
          padding-bottom: ${6 * SCALE}px;
          gap: ${6 * SCALE}px;
          min-height: 0;
          min-width: 0;
        }
        
        .export-name-pill {
          font-size: ${12 * SCALE}px;
          font-weight: 600;
          color: black;
          font-family: "Google Sans", sans-serif;
          white-space: nowrap;
          overflow: hidden;
        }
        
        .export-shift-pill {
          font-size: ${11 * SCALE}px;
          white-space: nowrap;
          font-family: "Google Sans", sans-serif;
          font-weight: 600;
          flex-shrink: 0;
        }
        
        .export-shift-pill.morning { background: var(--morning-color); color: white; }
        .export-shift-pill.evening { background: var(--evening-color); color: white; }
        .export-shift-pill.night { background: var(--night-color); color: white; }
        .export-shift-pill.rest { background: var(--rest-color); color: black; }
        .export-shift-pill.off { background: var(--off-color); color: black; }
        
        .export-work-cycle {
          font-size: ${11 * SCALE}px;
          color: black;
          font-family: "Google Sans", sans-serif;
          white-space: nowrap;
          flex-shrink: 0;
        }
        
        .export-empty-day-wrapper {
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 0;
          visibility: hidden;
        }
        
        .export-empty-day {
          flex: 1;
          min-height: 0;
        }
      `;
  document.head.appendChild(styleEl);

  // Create temporary container
  const tempContainer = document.createElement('div');
  tempContainer.className = 'export-container';
  document.body.appendChild(tempContainer);

  // Create calendar wrapper
  const calendarWrapper = document.createElement('div');
  calendarWrapper.className = 'export-calendar';

  // Add title
  const titleBlock = document.createElement('div');
  titleBlock.className = 'export-title-block';
  const title = document.createElement('h1');
  title.className = 'export-title';
  title.textContent = `${getMonthName(monthIndex)} 2026`;
  titleBlock.appendChild(title);
  calendarWrapper.appendChild(titleBlock);

  // Create grid container
  const gridContainer = document.createElement('div');
  gridContainer.className = 'export-grid-container';

  const tempGrid = document.createElement('div');
  tempGrid.className = 'export-grid';

  gridContainer.appendChild(tempGrid);
  calendarWrapper.appendChild(gridContainer);
  tempContainer.appendChild(calendarWrapper);

  // Render calendar
  const year = 2026;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Add day name headers
  dayNames.forEach(d => {
    const dn = document.createElement('div');
    dn.className = 'export-day-name';
    dn.textContent = d;
    tempGrid.appendChild(dn);
  });

  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // Always 42 cells (7 columns x 6 rows)
  const totalCells = 42;
  const emptyCellsAtStart = firstDay;
  const emptyCellsAtEnd = totalCells - emptyCellsAtStart - daysInMonth;

  // Normalize selected persons once for the entire month
  let personsArr;
  if (!selectedPersons || selectedPersons.size === 0) {
    personsArr = Array.from(teams);
  } else {
    personsArr = Array.from(selectedPersons).sort((a, b) => teams.indexOf(a) - teams.indexOf(b));
  }

  // Add empty cells at the beginning
  for (let i = 0; i < emptyCellsAtStart; i++) {
    const emptyDayWrapper = document.createElement('div');
    emptyDayWrapper.className = 'export-empty-day-wrapper';

    const emptyDay = document.createElement('div');
    emptyDay.className = 'export-empty-day';
    emptyDay.setAttribute('aria-hidden', 'true');

    emptyDayWrapper.appendChild(emptyDay);
    tempGrid.appendChild(emptyDayWrapper);
  }

  // Add calendar days
  for (let d = 1; d <= daysInMonth; d++) {
    const dayWrapper = document.createElement('div');
    dayWrapper.className = 'export-day-wrapper';

    const date = document.createElement('div');
    date.className = 'export-date';
    date.textContent = d;
    dayWrapper.appendChild(date);

    const day = document.createElement('div');
    day.className = 'export-day';

    personsArr.forEach(name => {
      const person = document.createElement('div');
      person.className = 'export-person';

      const namePill = document.createElement('span');
      namePill.className = 'export-name-pill';
      namePill.textContent = name;

      const assignDate = new Date(year, monthIndex, d);
      const assign = computeAssignment(name, assignDate);

      const shiftPill = document.createElement('span');
      shiftPill.className = `export-shift-pill ${assign.shift}`;
      shiftPill.textContent = SHIFT_LABELS[assign.shift] ?? assign.shift;

      person.appendChild(namePill);
      person.appendChild(shiftPill);

      // Add work cycle label for Day 1-6
      if (assign.cycleIndex >= 1 && assign.cycleIndex <= 6) {
        const workCycle = document.createElement('span');
        workCycle.className = 'export-work-cycle';
        workCycle.textContent = 'D' + assign.cycleIndex;
        person.appendChild(workCycle);
      }

      day.appendChild(person);
    });

    dayWrapper.appendChild(day);
    tempGrid.appendChild(dayWrapper);
  }

  // Add empty cells at the end
  for (let i = 0; i < emptyCellsAtEnd; i++) {
    const emptyDayWrapper = document.createElement('div');
    emptyDayWrapper.className = 'export-empty-day-wrapper';

    const emptyDay = document.createElement('div');
    emptyDay.className = 'export-empty-day';
    emptyDay.setAttribute('aria-hidden', 'true');

    emptyDayWrapper.appendChild(emptyDay);
    tempGrid.appendChild(emptyDayWrapper);
  }

  // Wait for render
  await new Promise(resolve => setTimeout(resolve, 100));

  // Generate image
  const canvas = await html2canvas(tempContainer, {
    scale: 2,
    useCORS: true,
    backgroundColor: 'white',
    width: A4_WIDTH,
    height: A4_HEIGHT,
    windowWidth: A4_WIDTH,
    windowHeight: A4_HEIGHT
  });

  const monthName = getMonthName(monthIndex);
  const monthTwo = String(monthIndex + 1).padStart(2, '0');
  const outYear = 2026;
  const personsForName = (personsArr && personsArr.length) ? personsArr : Array.from(teams);
  const personNames = personsForName.join('-');
  const filename = `${monthTwo}_${outYear}_${personNames}.png`;

  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png', 1.0);
  });

  // Clean up
  document.body.removeChild(tempContainer);
  document.head.removeChild(styleEl);

  return {
    blob,
    filename,
    monthIndex
  };
}

// ===== Preview modal logic =====
const previewModal = document.getElementById('previewModal');
const previewList = document.getElementById('previewList');
const closePreviewBtn = document.getElementById('closePreview');
const backPreviewBtn = document.getElementById('backPreview');

let previewItems = [];
let previewObjectUrls = [];

function openPreviewModal(items) {
  // items: [{blob, filename, monthIndex}, ...]
  previewItems = items;
  // create object URLs
  previewObjectUrls = previewItems.map(it => URL.createObjectURL(it.blob));

  // render all images in single page
  previewList.innerHTML = '';

  // Add iOS-specific instruction if on iOS device
  if (isIOSDevice()) {
    const iosInstruction = document.querySelector('.preview-instruction');
    if (iosInstruction) {
      iosInstruction.textContent = 'Tap any image to download the schedule';
    }
  }

  previewItems.forEach((it, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'preview-wrap';
    const img = document.createElement('img');
    img.className = 'preview-img';
    img.src = previewObjectUrls[idx];
    img.alt = it.filename;

    // Update title based on device
    if (isIOSDevice()) {
      img.title = `${getMonthName(it.monthIndex)} 2026`;
    } else {
      img.title = `${getMonthName(it.monthIndex)} 2026`;
    }

    // click any image to download/share that image
    img.addEventListener('click', async () => {
      await downloadBlobAs(previewItems[idx].blob, previewItems[idx].filename);
    }
    );

    const label = document.createElement('div');
    label.className = 'preview-label';
    label.textContent = it.filename;
    wrap.appendChild(img);
    wrap.appendChild(label);
    previewList.appendChild(wrap);
  }
  );

  previewModal.classList.add('show');
}

// Updated download function with iOS share support
async function downloadBlobAs(blob, filename) {
  // Check if running on iOS and Web Share API is available
  if (isIOSDevice() && navigator.share) {
    try {
      // For iOS, use Web Share API
      const file = new File([blob], filename, {
        type: 'image/png'
      });

      // Check if files can be shared
      if (navigator.canShare && navigator.canShare({
        files: [file]
      })) {
        await navigator.share({
          files: [file],
          title: 'Shift Schedule',
          text: `Download ${filename}`
        });
        console.log('Successfully shared on iOS');
      } else {
        // Fallback: convert to base64 and use data URL
        const base64 = await blobToBase64(blob);
        const a = document.createElement('a');
        a.href = base64;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        console.error('Error sharing on iOS:', error);
        // Fallback to regular download
        regularDownload(blob, filename);
      }
    }
  } else {
    // Non-iOS or Web Share API not available
    regularDownload(blob, filename);
  }
}

// Regular download for non-iOS devices
function regularDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Helper function to detect iOS device
function isIOSDevice() {
  return ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform)// iPad on iOS 13+ detection
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
}

// Helper function to convert blob to base64 for iOS share
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  }
  );
}

// close handlers (revoke URLs)
function closePreview() {
  previewModal.classList.remove('show');
  previewList.innerHTML = '';
  previewItems = [];
  previewObjectUrls.forEach(u => URL.revokeObjectURL(u));
  previewObjectUrls = [];
}

closePreviewBtn.addEventListener('click', closePreview);

// close modal when clicking outside the download modal
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.remove('show');
  }
}
);

// close modal when clicking outside
previewModal.addEventListener('click', (e) => {
  if (e.target === previewModal)
    closePreview();
}
);

// Update the back button handler
backPreviewBtn.addEventListener('click', () => {
  // Close preview modal
  closePreview();

  // Reopen download modal
  modal.classList.add('show');
}
);

// Helper function to get month name
function getMonthName(monthIndex) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[monthIndex];
}

// Add inspect button handler after the downloadBtn event listener
const inspectBtn = document.getElementById('inspectBtn');

inspectBtn.addEventListener('click', () => {
  // Check if any person and month is selected
  if (downloadSelection.persons.size === 0 || downloadSelection.months.size === 0) {
    return;
  }

  // Get selected persons and months
  const selectedPersons = downloadSelection.persons;
  const selectedMonths = Array.from(downloadSelection.months).sort((a, b) => a - b);

  // Use first selected month
  const monthIndex = selectedMonths[0];

  // Open new window with export preview
  openInspectWindow(monthIndex, selectedPersons);
});

function openInspectWindow(monthIndex, selectedPersons) {
  const SCALE = 3.6;
  const A4_WIDTH = 3508;
  const A4_HEIGHT = 2480;

  // Normalize selected persons
  let personsArr;
  if (!selectedPersons || selectedPersons.size === 0) {
    personsArr = Array.from(teams);
  } else {
    personsArr = Array.from(selectedPersons).sort((a, b) => teams.indexOf(a) - teams.indexOf(b));
  }

  const year = 2026;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  
  const totalCells = 42;
  const emptyCellsAtStart = firstDay;
  const emptyCellsAtEnd = totalCells - emptyCellsAtStart - daysInMonth;

  // Generate HTML for calendar
  let calendarHTML = '';
  
  // Day names
  dayNames.forEach(d => {
    calendarHTML += `<div class="export-day-name">${d}</div>`;
  });

  // Empty cells at start
  for (let i = 0; i < emptyCellsAtStart; i++) {
    calendarHTML += `
      <div class="export-empty-day-wrapper">
        <div class="export-empty-day" aria-hidden="true"></div>
      </div>
    `;
  }

  // Calendar days
  for (let d = 1; d <= daysInMonth; d++) {
    let personsHTML = '';
    
    personsArr.forEach(name => {
      const assignDate = new Date(year, monthIndex, d);
      const assign = computeAssignment(name, assignDate);
      
      const workCycleHTML = (assign.cycleIndex >= 1 && assign.cycleIndex <= 6) 
        ? `<span class="export-work-cycle">D${assign.cycleIndex}</span>`
        : '';
      
      personsHTML += `
        <div class="export-person">
          <span class="export-name-pill">${name}</span>
          <span class="export-shift-pill ${assign.shift}">${SHIFT_LABELS[assign.shift] ?? assign.shift}</span>
          ${workCycleHTML}
        </div>
      `;
    });

    calendarHTML += `
      <div class="export-day-wrapper">
        <div class="export-date">${d}</div>
        <div class="export-day">
          ${personsHTML}
        </div>
      </div>
    `;
  }

  // Empty cells at end
  for (let i = 0; i < emptyCellsAtEnd; i++) {
    calendarHTML += `
      <div class="export-empty-day-wrapper">
        <div class="export-empty-day" aria-hidden="true"></div>
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Google+Sans:opsz,wght@17..18,400..700&display=swap" rel="stylesheet">
      <title>Inspect - ${getMonthName(monthIndex)} 2026</title>
      <style>
        :root {
          --morning-color: #0369a1;
          --evening-color: #b91c1c;
          --night-color: #5f6f82;
          --off-color: antiquewhite;
          --rest-color: antiquewhite;
          --border-style: ${2 * SCALE}px solid var(--night-color);
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 20px;
          background: white;
          font-family: "Google Sans", sans-serif;
        }

        .export-container {
          width: ${A4_WIDTH}px;
          height: ${A4_HEIGHT}px;
          background: white;
          margin: 0 auto;
          box-sizing: border-box;
          overflow: hidden;
        }
        
        .export-calendar {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: white;
          box-sizing: border-box;
        }
        
        .export-title-block {
          text-align: center;
          flex-shrink: 0;
        }
        
        .export-title {
          margin: 0;
          font-size: ${16 * SCALE}px;
          font-weight: 600;
          font-family: "Google Sans", sans-serif;
          color: black;
          padding-bottom: ${6 * SCALE}px;
        }
        
        .export-grid-container {
          flex: 1;
          overflow: hidden;
          min-height: 0;
          box-sizing: border-box;
        }
        
        .export-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          grid-template-rows: auto repeat(6, 1fr);
          gap: ${6 * SCALE}px;
          height: 100%;
          width: 100%;
          box-sizing: border-box;
        }
        
        .export-day-name {
          font-size: ${13 * SCALE}px;
          font-weight: 600;
          text-align: center;
          background: transparent;
          border-bottom: var(--border-style);
          font-family: "Google Sans", sans-serif;
          color: black;
          box-sizing: border-box;
        }
        
        .export-day-wrapper {
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 0;
          box-sizing: border-box;
        }
        
        .export-date {
          font-size: ${12 * SCALE}px;
          font-weight: 600;
          text-align: center;
          color: black;
          font-family: "Google Sans", sans-serif;
          flex-shrink: 0;
        }
        
        .export-day {
          flex: 1;
          background: white;
          border: var(--border-style);
          border-radius: ${6 * SCALE}px;
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 0;
          padding: ${6 * SCALE}px ${6 * SCALE}px 0 ${6 * SCALE}px;
        }
        
        .export-person {
          align-items: center;
          display: flex;
          padding-bottom: ${6 * SCALE}px;
          gap: ${6 * SCALE}px;
          min-height: 0;
          min-width: 0;
        }
        
        .export-name-pill {
          font-size: ${12 * SCALE}px;
          font-weight: 600;
          color: black;
          font-family: "Google Sans", sans-serif;
          white-space: nowrap;
          overflow: hidden;
        }
        
        .export-shift-pill {
          font-size: ${11 * SCALE}px;
          white-space: nowrap;
          font-family: "Google Sans", sans-serif;
          font-weight: 600;
          flex-shrink: 0;
        }
        
        .export-shift-pill.morning { background: var(--morning-color); color: white; }
        .export-shift-pill.evening { background: var(--evening-color); color: white; }
        .export-shift-pill.night { background: var(--night-color); color: white; }
        .export-shift-pill.rest { background: var(--rest-color); color: black; }
        .export-shift-pill.off { background: var(--off-color); color: black; }
        
        .export-work-cycle {
          font-size: ${11 * SCALE}px;
          color: black;
          font-family: "Google Sans", sans-serif;
          white-space: nowrap;
          flex-shrink: 0;
        }
        
        .export-empty-day-wrapper {
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 0;
          visibility: hidden;
        }
        
        .export-empty-day {
          flex: 1;
          min-height: 0;
        }
      </style>
    </head>
    <body>
      <div class="export-container">
        <div class="export-calendar">
          <div class="export-title-block">
            <h1 class="export-title">${getMonthName(monthIndex)} 2026</h1>
          </div>
          <div class="export-grid-container">
            <div class="export-grid">
              ${calendarHTML}
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const newWindow = window.open('', '_blank');
  newWindow.document.write(html);
  newWindow.document.close();
}