const UK_TIME_ZONE = 'Europe/London';

type DateTimeParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
};

function ukParts(value?: string | null): DateTimeParts | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: UK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));

  if (!values.year || !values.month || !values.day || !values.hour || !values.minute) return null;
  return values as DateTimeParts;
}

export function ukDatePart(value?: string | null) {
  const parts = ukParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
}

export function ukTimePart(value?: string | null) {
  const parts = ukParts(value);
  return parts ? `${parts.hour}:${parts.minute}` : '';
}

export function ukDateTimeToIso(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isInteger)) throw new Error('Enter a valid date and time.');

  const wallClock = Date.UTC(year, month - 1, day, hour, minute);
  let guess = new Date(wallClock);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = ukParts(guess.toISOString());
    if (!parts) break;
    const actual = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    const difference = wallClock - actual;
    if (difference === 0) return guess.toISOString();
    guess = new Date(guess.getTime() + difference);
  }

  throw new Error('This UK time is invalid because of the daylight-saving clock change.');
}

function nextCalendarDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  if (![year, month, day].every(Number.isInteger)) throw new Error('Enter a valid date and time.');
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

export function ukEventEndToIso(startDate: string, startTime: string, endTime: string, explicitEndDate?: string | null) {
  const start = ukDateTimeToIso(startDate, startTime);
  const selectedEndDate = explicitEndDate?.trim() || null;
  let end = ukDateTimeToIso(selectedEndDate || startDate, endTime);

  if (!selectedEndDate && new Date(end) < new Date(start)) {
    end = ukDateTimeToIso(nextCalendarDate(startDate), endTime);
  }
  if (new Date(end) <= new Date(start)) throw new Error('End time must be after the start time.');

  return end;
}
