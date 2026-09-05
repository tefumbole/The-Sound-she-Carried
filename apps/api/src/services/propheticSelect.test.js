import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assignPropheticWord,
  donationReference,
  firstNameFrom,
  personalize,
  pickUnusedMessage,
  thankYouLine,
  weekdayInDouala,
} from './propheticSelect.js';
import { propheticLibrary } from '../db/propheticSeed.js';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

test('library has 50 unique minstrel messages per weekday', () => {
  const all = propheticLibrary();
  assert.equal(all.length, 350);
  assert.equal(new Set(all.map((r) => r.message)).size, 350);
  assert.ok(all.every((r) => r.message_family && r.title && r.declaration.startsWith('I DECLARE')));
  assert.ok(all.every((r) => r.message.includes('{{firstName}}')));
  for (const day of DAYS) {
    const rows = all.filter((r) => r.day_of_week === day);
    assert.equal(rows.length, 50, day);
    assert.equal(new Set(rows.map((r) => r.message)).size, 50, `${day} unique wording`);
    assert.ok(new Set(rows.map((r) => r.message_family)).size >= 20, `${day} family mix`);
  }
});

test('firstNameFrom and personalize', () => {
  assert.equal(firstNameFrom('grace ACHA'), 'Grace');
  assert.equal(firstNameFrom(''), 'Friend');
  assert.equal(personalize('Hello {{firstName}}', 'Daniel'), 'Hello Daniel');
});

test('thankYouLine variants hide exact counts', () => {
  assert.match(thankYouLine(1), /becoming part/);
  assert.match(thankYouLine(2), /again/);
  assert.match(thankYouLine(8), /continued partnership/);
});

test('donationReference is stable TSSC code', () => {
  const id = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
  assert.equal(donationReference(id), 'TSSC-9B1DEB4D');
});

test('weekdayInDouala returns a weekday key', () => {
  const day = weekdayInDouala(new Date('2026-09-05T12:00:00+01:00'));
  assert.equal(day, 'saturday');
});

function familyOf(row) {
  return row.message_family || row.theme;
}

function fakeConn(store) {
  return {
    async query(sql, params = []) {
      const text = String(sql).replace(/\s+/g, ' ');
      if (text.includes('FROM contributor_prophetic_messages') && text.includes('pm.message_family')) {
        const recent = (store.recentFamilies || []).map((message_family) => ({ message_family, theme: message_family }));
        return [recent];
      }
      if (text.includes('FROM contributor_prophetic_messages') && text.includes('prophetic_message_id FROM')) {
        return [store.used.map((id) => ({ prophetic_message_id: id }))];
      }
      if (text.includes('FROM prophetic_messages')) {
        const unused = store.messages.filter((m) => m.active && !store.used.includes(m.id));
        let pool = unused;
        const wantsDay = text.includes('day_of_week = ?');
        const wantsFamilySkip = text.includes('NOT IN') && text.includes('message_family');
        if (wantsDay) pool = pool.filter((m) => m.day_of_week === params[0]);
        if (wantsFamilySkip) {
          const skip = wantsDay ? params.slice(1) : params;
          pool = pool.filter((m) => !skip.includes(familyOf(m)));
        }
        return [pool.slice(0, 1)];
      }
      if (text.includes('FROM contributors WHERE id')) {
        return [[store.contributor]];
      }
      if (text.includes('FROM contributors')) {
        return [[]];
      }
      if (text.includes('INSERT INTO contributors')) {
        store.contributor = { id: params[0], first_name: params[1] };
        return [{ insertId: 1 }];
      }
      if (text.includes('UPDATE donations')) return [{ affectedRows: 1 }];
      if (text.includes('COUNT(*)')) return [[{ count: store.successCount || 1 }]];
      if (text.includes('FROM contributor_prophetic_messages cpm')) {
        if (store.assignment) return [[{ ...store.assignment, ...store.assignment.messageRow }]];
        return [[]];
      }
      if (text.includes('INSERT INTO contributor_prophetic_messages')) {
        if (store.assignment) {
          const err = new Error('Duplicate entry');
          throw err;
        }
        store.assignment = {
          contribution_id: params[2],
          prophetic_message_id: params[3],
          messageRow: store.messages.find((m) => m.id === params[3]),
        };
        store.used.push(params[3]);
        return [{ insertId: 1 }];
      }
      return [[]];
    },
  };
}

test('pickUnusedMessage prefers today and skips recent families', async () => {
  const messages = [
    { id: 'd-mercy', active: 1, day_of_week: 'monday', theme: 'mercy', message_family: 'mercy', message: 'A' },
    { id: 'd-favour', active: 1, day_of_week: 'monday', theme: 'favour', message_family: 'favour', message: 'B' },
    { id: 'x-wisdom', active: 1, day_of_week: 'sunday', theme: 'wisdom', message_family: 'wisdom', message: 'C' },
    { id: 'x-mercy', active: 1, day_of_week: 'sunday', theme: 'mercy', message_family: 'mercy', message: 'D' },
  ];
  const store = { used: [], messages, recentFamilies: ['mercy'] };
  const conn = fakeConn(store);
  const first = await pickUnusedMessage(conn, { usedIds: store.used, day: 'monday', recentFamilies: ['mercy'] });
  assert.equal(first.id, 'd-favour');
  store.used.push('d-favour');
  const second = await pickUnusedMessage(conn, { usedIds: store.used, day: 'monday', recentFamilies: ['mercy', 'favour'] });
  assert.equal(second.id, 'd-mercy');
  store.used.push('d-mercy');
  const third = await pickUnusedMessage(conn, { usedIds: store.used, day: 'monday', recentFamilies: ['mercy', 'favour'] });
  assert.equal(third.id, 'x-wisdom');
});

test('assignPropheticWord does not consume a second message on repeat', async () => {
  const today = weekdayInDouala();
  const messages = [
    { id: 'm1', active: 1, day_of_week: today, theme: 'mercy', message_family: 'mercy', message: '{{firstName}} one', scripture_reference: 'Ps 1', scripture_text: 'x', declaration: 'I DECLARE: y', title: 'MERCY' },
    { id: 'm2', active: 1, day_of_week: today, theme: 'favour', message_family: 'favour', message: '{{firstName}} two', scripture_reference: 'Ps 2', scripture_text: 'x', declaration: 'I DECLARE: y', title: 'FAVOUR' },
  ];
  const store = { used: [], messages, successCount: 1, recentFamilies: [] };
  const conn = fakeConn(store);
  const donation = {
    id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    holder_name: 'Grace Acha',
    whatsapp_phone: '+237697470711',
    email: 'grace@example.com',
    amount: 5000,
    status: 'successful',
  };
  const first = await assignPropheticWord(conn, { ...donation });
  const firstId = store.assignment.prophetic_message_id;
  const second = await assignPropheticWord(conn, { ...donation, contributor_id: store.contributor.id });
  assert.equal(store.used.length, 1);
  assert.equal(store.assignment.prophetic_message_id, firstId);
  assert.equal(first.message, second.message);
});
