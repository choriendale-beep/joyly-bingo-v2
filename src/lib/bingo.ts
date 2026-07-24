import { Cartel, CartelGrid, CalledBall, TicketItem } from '../types';

export function getLetterForNumber(num: number): 'B' | 'I' | 'N' | 'G' | 'O' {
  if (num >= 1 && num <= 15) return 'B';
  if (num >= 16 && num <= 30) return 'I';
  if (num >= 31 && num <= 45) return 'N';
  if (num >= 46 && num <= 60) return 'G';
  if (num >= 61 && num <= 75) return 'O';
  return 'B';
}

function getRandomNumbersInRange(min: number, max: number, count: number, seedOffset: number = 0): number[] {
  const nums: number[] = [];
  let attempts = 0;
  while (nums.length < count && attempts < 500) {
    attempts++;
    const val = Math.floor(Math.random() * (max - min + 1)) + min;
    if (!nums.includes(val)) {
      nums.push(val);
    }
  }
  // Ensure we always have exact count
  while (nums.length < count) {
    const fallback = min + ((nums.length + seedOffset) % (max - min + 1));
    if (!nums.includes(fallback)) nums.push(fallback);
  }
  return nums.sort((a, b) => a - b);
}

export function generateCartelForTicket(ticketNumber: number): Cartel {
  const bNums = getRandomNumbersInRange(1, 15, 5, ticketNumber);
  const iNums = getRandomNumbersInRange(16, 30, 5, ticketNumber * 2);
  const nNums = getRandomNumbersInRange(31, 45, 4, ticketNumber * 3); // 4 + FREE
  const gNums = getRandomNumbersInRange(46, 60, 5, ticketNumber * 4);
  const oNums = getRandomNumbersInRange(61, 75, 5, ticketNumber * 5);

  const grid: CartelGrid = Array.from({ length: 5 }, () => Array.from({ length: 5 }));

  for (let row = 0; row < 5; row++) {
    grid[row][0] = { number: bNums[row], daubed: false };
    grid[row][1] = { number: iNums[row], daubed: false };
    if (row === 2) {
      grid[row][2] = { number: 'FREE', daubed: true };
    } else {
      const nIndex = row > 2 ? row - 1 : row;
      grid[row][2] = { number: nNums[nIndex], daubed: false };
    }
    grid[row][3] = { number: gNums[row], daubed: false };
    grid[row][4] = { number: oNums[row], daubed: false };
  }

  return {
    id: `cartela-${ticketNumber}`,
    ticketNumber,
    grid,
  };
}

export function generateTicketList(totalTickets: number = 400): TicketItem[] {
  const list: TicketItem[] = [];
  for (let i = 1; i <= totalTickets; i++) {
    list.push({
      number: i,
      selected: false,
      cartel: generateCartelForTicket(i),
    });
  }
  return list;
}

export function generateAll75Balls(): CalledBall[] {
  const balls: CalledBall[] = [];
  for (let i = 1; i <= 75; i++) {
    const letter = getLetterForNumber(i);
    balls.push({
      letter,
      number: i,
      formatted: `${letter}-${i}`,
    });
  }
  // Shuffle Fisher-Yates
  for (let i = balls.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [balls[i], balls[j]] = [balls[j], balls[i]];
  }
  return balls;
}

export function checkBingoWin(
  grid: CartelGrid,
  calledNumbers: Set<number>
): { isWin: boolean; pattern?: string } {
  const isCellMarked = (r: number, c: number) => {
    const cell = grid[r][c];
    if (cell.number === 'FREE') return true;
    return typeof cell.number === 'number' && (cell.daubed || calledNumbers.has(cell.number));
  };

  // Horizontal Rows
  for (let r = 0; r < 5; r++) {
    let win = true;
    for (let c = 0; c < 5; c++) {
      if (!isCellMarked(r, c)) {
        win = false;
        break;
      }
    }
    if (win) return { isWin: true, pattern: `Horizontal Row ${r + 1}` };
  }

  // Vertical Columns
  for (let c = 0; c < 5; c++) {
    let win = true;
    for (let r = 0; r < 5; r++) {
      if (!isCellMarked(r, c)) {
        win = false;
        break;
      }
    }
    if (win) return { isWin: true, pattern: `Vertical Column ${c + 1}` };
  }

  // Main Diagonal
  let diag1 = true;
  for (let i = 0; i < 5; i++) {
    if (!isCellMarked(i, i)) {
      diag1 = false;
      break;
    }
  }
  if (diag1) return { isWin: true, pattern: 'Main Diagonal' };

  // Anti Diagonal
  let diag2 = true;
  for (let i = 0; i < 5; i++) {
    if (!isCellMarked(i, 4 - i)) {
      diag2 = false;
      break;
    }
  }
  if (diag2) return { isWin: true, pattern: 'Reverse Diagonal' };

  // 4 Corners
  if (isCellMarked(0, 0) && isCellMarked(0, 4) && isCellMarked(4, 0) && isCellMarked(4, 4)) {
    return { isWin: true, pattern: '4 Corners' };
  }

  return { isWin: false };
}
