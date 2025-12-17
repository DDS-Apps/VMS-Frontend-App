export interface ReminderSchedule {
  firstReminderAt: string | undefined;
  secondReminderAt: string | undefined;
  autoCancelAt: string | undefined;
  firstReminderSent: boolean;
  secondReminderSent: boolean;
}

export interface ReminderConfig {
  firstReminderDelay: number;
  secondReminderDelay: number;
  autoCancelDelay: number;
  workingHoursStart: number;
  workingHoursEnd: number;
}

const DEFAULT_CONFIG: ReminderConfig = {
  firstReminderDelay: 2,
  secondReminderDelay: 4,
  autoCancelDelay: 5,
  workingHoursStart: 9,
  workingHoursEnd: 18,
};

const adjustForWorkingHours = (
  date: Date,
  workingHoursStart: number,
  workingHoursEnd: number
): Date => {
  const adjustedDate = new Date(date);
  const hours = adjustedDate.getHours();
  
  if (hours < workingHoursStart) {
    adjustedDate.setDate(adjustedDate.getDate() - 1);
    adjustedDate.setHours(workingHoursEnd - 1, 0, 0, 0);
  } else if (hours >= workingHoursEnd) {
    adjustedDate.setHours(workingHoursEnd - 1, 0, 0, 0);
  }
  
  return adjustedDate;
};

export const calculateReminderSchedule = (
  visitDateStr: string,
  visitTimeStr: string,
  config: Partial<ReminderConfig> = {}
): ReminderSchedule => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { firstReminderDelay, secondReminderDelay, autoCancelDelay, workingHoursStart, workingHoursEnd } = mergedConfig;
  
  const visitDate = new Date(`${visitDateStr} ${visitTimeStr}`);
  
  if (isNaN(visitDate.getTime())) {
    return {
      firstReminderAt: undefined,
      secondReminderAt: undefined,
      autoCancelAt: undefined,
      firstReminderSent: false,
      secondReminderSent: false,
    };
  }
  
  const firstReminder = new Date(visitDate.getTime() - firstReminderDelay * 60 * 60 * 1000);
  const secondReminder = new Date(visitDate.getTime() - secondReminderDelay * 60 * 60 * 1000);
  const autoCancel = new Date(visitDate.getTime() - autoCancelDelay * 60 * 60 * 1000);

  return {
    firstReminderAt: adjustForWorkingHours(firstReminder, workingHoursStart, workingHoursEnd).toISOString(),
    secondReminderAt: adjustForWorkingHours(secondReminder, workingHoursStart, workingHoursEnd).toISOString(),
    autoCancelAt: adjustForWorkingHours(autoCancel, workingHoursStart, workingHoursEnd).toISOString(),
    firstReminderSent: false,
    secondReminderSent: false,
  };
};

export const isReminderDue = (reminderTime: string | undefined): boolean => {
  if (!reminderTime) return false;
  const reminderDate = new Date(reminderTime);
  return reminderDate <= new Date();
};

export const getNextReminder = (schedule: ReminderSchedule): { type: 'first' | 'second' | 'auto_cancel' | null; time: string | null } => {
  const now = new Date();
  
  if (schedule.firstReminderAt && !schedule.firstReminderSent) {
    const firstDate = new Date(schedule.firstReminderAt);
    if (firstDate > now) {
      return { type: 'first', time: schedule.firstReminderAt };
    }
  }
  
  if (schedule.secondReminderAt && !schedule.secondReminderSent) {
    const secondDate = new Date(schedule.secondReminderAt);
    if (secondDate > now) {
      return { type: 'second', time: schedule.secondReminderAt };
    }
  }
  
  if (schedule.autoCancelAt) {
    const autoCancelDate = new Date(schedule.autoCancelAt);
    if (autoCancelDate > now) {
      return { type: 'auto_cancel', time: schedule.autoCancelAt };
    }
  }
  
  return { type: null, time: null };
};

export const getReminderTypeLabel = (type: 'first' | 'second' | 'auto_cancel' | null): string => {
  switch (type) {
    case 'first': return 'admin.firstReminder';
    case 'second': return 'admin.secondReminder';
    case 'auto_cancel': return 'admin.autoCancel';
    default: return '';
  }
};
