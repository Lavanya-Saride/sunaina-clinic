import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mergeFeedback, normalizeFeedback } from './feedbackMerge.js';

const item = (id, createdAt, extra = {}) => ({ _id: id, name: `Name ${id}`, story: `Story for ${id} here`, createdAt, updatedAt: createdAt, ...extra });

describe('feedback list merging', () => {
  test('orders newest first regardless of arrival order', () => {
    const list = normalizeFeedback([item('a', '2026-01-01T00:00:00Z'), item('c', '2026-03-01T00:00:00Z'), item('b', '2026-02-01T00:00:00Z')]);
    assert.deepEqual(list.map((entry) => entry._id), ['c', 'b', 'a']);
  });

  test('removes duplicates by record id, accepting either id or _id', () => {
    const list = normalizeFeedback([item('a', '2026-01-01T00:00:00Z'), { id: 'a', name: 'dup', story: 'dup dup dup', createdAt: '2026-01-01T00:00:00Z' }, item('b', '2026-01-02T00:00:00Z')]);
    assert.equal(list.length, 2);
  });

  test('a newly saved record appears at the front on the next refresh', () => {
    const before = mergeFeedback([], [item('a', '2026-01-01T00:00:00Z'), item('b', '2026-01-02T00:00:00Z')]);
    const after = mergeFeedback(before, [item('c', '2026-01-03T00:00:00Z'), item('b', '2026-01-02T00:00:00Z'), item('a', '2026-01-01T00:00:00Z')]);
    assert.deepEqual(after.map((entry) => entry._id), ['c', 'b', 'a']);
  });

  test('an unchanged refresh returns the same array so React skips the re-render', () => {
    const first = mergeFeedback([], [item('a', '2026-01-01T00:00:00Z'), item('b', '2026-01-02T00:00:00Z')]);
    const again = mergeFeedback(first, [item('b', '2026-01-02T00:00:00Z'), item('a', '2026-01-01T00:00:00Z')]);
    assert.equal(again, first);
  });

  test('an edited or removed record is reflected', () => {
    const first = mergeFeedback([], [item('a', '2026-01-01T00:00:00Z'), item('b', '2026-01-02T00:00:00Z')]);
    const edited = mergeFeedback(first, [item('b', '2026-01-02T00:00:00Z', { story: 'Edited story text' }), item('a', '2026-01-01T00:00:00Z')]);
    assert.notEqual(edited, first);
    assert.equal(edited[0].story, 'Edited story text');
    assert.deepEqual(mergeFeedback(edited, [item('b', '2026-01-02T00:00:00Z')]).map((entry) => entry._id), ['b']);
  });

  test('the list is capped after sorting so the newest items always survive', () => {
    const many = Array.from({ length: 12 }, (_, index) => item(String(index).padStart(2, '0'), `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00Z`));
    const capped = normalizeFeedback(many, 10);
    assert.equal(capped.length, 10);
    assert.equal(capped[0]._id, '11');
  });

  test('records created in the same instant keep a stable order', () => {
    const same = '2026-01-01T00:00:00Z';
    const one = normalizeFeedback([item('a', same), item('b', same)]);
    const two = normalizeFeedback([item('b', same), item('a', same)]);
    assert.deepEqual(one.map((entry) => entry._id), two.map((entry) => entry._id));
  });

  test('malformed responses yield an empty list instead of throwing', () => {
    for (const bad of [undefined, null, {}, 'x', 5]) assert.deepEqual(normalizeFeedback(bad), []);
    assert.deepEqual(normalizeFeedback([null, undefined, {}, item('a', '2026-01-01T00:00:00Z')]).map((entry) => entry._id), ['a']);
  });
});
