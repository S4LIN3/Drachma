export const getCurrentMonthKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const getTodayDateStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseMonthKey = (monthKey) => {
  if (!monthKey || typeof monthKey !== 'string') {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth() };
  }
  const parts = monthKey.split('-');
  const year = parseInt(parts[0], 10);
  const monthIndex = parseInt(parts[1], 10) - 1;
  return {
    year: isNaN(year) ? new Date().getFullYear() : year,
    monthIndex: isNaN(monthIndex) ? new Date().getMonth() : monthIndex
  };
};

export const formatMonthTitle = (monthKey) => {
  const { year, monthIndex } = parseMonthKey(monthKey);
  const date = new Date(year, monthIndex, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export const getDaysInMonth = (year, monthIndex) => {
  return new Date(year, monthIndex + 1, 0).getDate();
};

export const getAdjacentMonthKey = (monthKey, offset) => {
  const { year, monthIndex } = parseMonthKey(monthKey);
  const targetDate = new Date(year, monthIndex + offset, 1);
  const targetYear = targetDate.getFullYear();
  const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
  return `${targetYear}-${targetMonth}`;
};

export const normalizeDateStr = (dateVal) => {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    const d = String(dateVal.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(dateVal).trim();
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];

  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return s;
};

export const formatDateDisplay = (dateStr, format = 'medium') => {
  if (!dateStr) return '';
  const clean = normalizeDateStr(dateStr);
  const parts = clean.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return clean;
  }
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  if (format === 'short') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (format === 'full') {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const getDayOfWeekName = (dateStr) => {
  if (!dateStr) return '';
  const clean = normalizeDateStr(dateStr);
  const parts = clean.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return '';
  }
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

export const getCalendarGrid = (monthKey) => {
  const { year, monthIndex } = parseMonthKey(monthKey);
  const daysInCurrentMonth = getDaysInMonth(year, monthIndex);
  
  // First day of current month (0 = Sunday, 1 = Monday, ...)
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();
  
  // Days in previous month
  const prevMonthDate = new Date(year, monthIndex, 0);
  const daysInPrevMonth = prevMonthDate.getDate();
  const prevMonthYear = prevMonthDate.getFullYear();
  const prevMonthIndex = prevMonthDate.getMonth();
  
  const todayStr = getTodayDateStr();
  const grid = [];
  
  // 1. Fill previous month's trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const mStr = String(prevMonthIndex + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const dateStr = `${prevMonthYear}-${mStr}-${dStr}`;
    const dayOfWeek = new Date(prevMonthYear, prevMonthIndex, day).getDay();
    
    grid.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dayOfWeek,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      monthKey: `${prevMonthYear}-${mStr}`,
    });
  }
  
  // 2. Fill current month's days
  const curMonthStr = String(monthIndex + 1).padStart(2, '0');
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const dStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${curMonthStr}-${dStr}`;
    const dayOfWeek = new Date(year, monthIndex, day).getDay();
    
    grid.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      dayOfWeek,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      monthKey,
    });
  }
  
  // 3. Fill next month's leading days to complete 35 or 42 grid slots
  const remainingSlots = (7 - (grid.length % 7)) % 7;
  // If we have 35 or less, we can pad to 35 or 42 for a uniform 5/6 week calendar
  const totalSlotsNeeded = grid.length + remainingSlots <= 35 ? 35 : 42;
  const nextSlots = totalSlotsNeeded - grid.length;
  
  const nextMonthDate = new Date(year, monthIndex + 1, 1);
  const nextMonthYear = nextMonthDate.getFullYear();
  const nextMonthIndex = nextMonthDate.getMonth();
  const nextMonthStr = String(nextMonthIndex + 1).padStart(2, '0');
  
  for (let day = 1; day <= nextSlots; day++) {
    const dStr = String(day).padStart(2, '0');
    const dateStr = `${nextMonthYear}-${nextMonthStr}-${dStr}`;
    const dayOfWeek = new Date(nextMonthYear, nextMonthIndex, day).getDay();
    
    grid.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dayOfWeek,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      monthKey: `${nextMonthYear}-${nextMonthStr}`,
    });
  }
  
  return grid;
};
