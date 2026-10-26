import { describe, it, expect, beforeEach } from 'bun:test';
import { maybeNotify } from '../src/lib/documentReminder';

const values = new Map<string, string>();
let notices: { title: string; body?: string }[] = [];
let hidden = false;
beforeEach(() => {
  values.clear(); notices = []; hidden = false;
  values.set('medora.docReminder.notifyEnabled', 'true');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { get hidden() { return hidden; } } });
  Object.defineProperty(globalThis, 'Notification', { configurable: true, value: class {
    static permission = 'granted';
    constructor(title: string, options: { body?: string }) { notices.push({ title, body: options.body }); }
  } });
});
describe('Reminder notification privacy', () => {
  it('uses generic content with no medical or upload details', () => {
    maybeNotify([]);
    expect(notices).toEqual([{ title: 'Medora reminder', body: 'You have a reminder in Medora. Open the app to review it.' }]);
  });
  it('does not send notifications while Medora is hidden', () => {
    hidden = true;
    maybeNotify([]);
    expect(notices.length).toBe(0);
  });
});