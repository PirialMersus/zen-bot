import { describe, expect, it, vi } from 'vitest';

vi.mock('mongoose', () => {
  const schemaMock = function () {};
  schemaMock.prototype.index = vi.fn();
  schemaMock.Types = { ObjectId: String };
  return {
    default: {
      Schema: schemaMock,
      model: vi.fn(() => ({})),
      connect: vi.fn(),
      disconnect: vi.fn(),
      connection: { collections: {} }
    }
  };
});

vi.mock('telegraf', () => {
  const markupMock = {
    button: { callback: vi.fn(), text: vi.fn() },
    inlineKeyboard: vi.fn(() => ({})),
    keyboard: vi.fn(() => ({ resize: vi.fn(() => ({})) })),
    removeKeyboard: vi.fn(() => ({}))
  };
  return {
    Telegraf: vi.fn(),
    Markup: markupMock
  };
});

vi.mock('https', () => ({ default: { get: vi.fn() } }));

vi.mock('../../src/models/User.js', () => ({ default: { findOne: vi.fn(), find: vi.fn(), updateOne: vi.fn(), create: vi.fn() } }));
vi.mock('../../src/models/Reminder.js', () => ({ default: { find: vi.fn(), create: vi.fn() } }));
vi.mock('../../src/models/Pointer.js', () => ({ Pointer: { find: vi.fn(), countDocuments: vi.fn() } }));
vi.mock('../../src/models/Activity.js', () => ({ default: { deleteMany: vi.fn() } }));

vi.mock('../../src/utils/logger.js', () => ({ logError: vi.fn() }));

vi.mock('dotenv', () => ({ config: vi.fn() }));

describe('Целостность импортов модулей (Integrity Check)', () => {
  it('должен успешно импортировать сервис поинтеров', async () => {
    const module = await import('../../src/services/pointers.js');
    expect(typeof module.getNextPointerForUser).toBe('function');
  });

  it('должен успешно импортировать сервис тихих часов', async () => {
    const module = await import('../../src/services/quietHours.js');
    expect(typeof module.isQuietNow).toBe('function');
  });

  it('должен успешно импортировать сервис планировщика', async () => {
    const module = await import('../../src/services/scheduler.js');
    expect(typeof module.startScheduler).toBe('function');
  });

  it('должен успешно импортировать сервис cleanupUser', async () => {
    const module = await import('../../src/services/cleanupUser.js');
    expect(typeof module.cleanupUser).toBe('function');
  });

  it('должен успешно импортировать хендлер поинтеров', async () => {
    const module = await import('../../src/handlers/pointers.js');
    expect(typeof module.handlePointer).toBe('function');
    expect(typeof module.handleNextPointer).toBe('function');
  });

  it('должен успешно импортировать хендлер меню', async () => {
    const module = await import('../../src/handlers/menu.js');
    expect(typeof module.handleStart).toBe('function');
  });

  it('должен успешно импортировать хендлер напоминаний', async () => {
    const module = await import('../../src/handlers/reminders.js');
    expect(module).toBeTruthy();
  });

  it('должен успешно импортировать хендлер настроек', async () => {
    const module = await import('../../src/handlers/settings/index.js');
    expect(module).toBeTruthy();
  });

  it('должен успешно импортировать хендлер администратора и рассылки', async () => {
    const module = await import('../../src/handlers/admin.js');
    expect(typeof module.handleAdminActiveUsers).toBe('function');
    expect(typeof module.handleAdminBroadcastStart).toBe('function');
    expect(typeof module.handleFeedbackStart).toBe('function');
    expect(typeof module.handleFeedbackMessage).toBe('function');
  });
});
