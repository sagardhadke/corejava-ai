import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStr, fuzzyIncludes } from '../utils/search.js';

describe('Search & Normalization Unit Tests (BUG-CP-06)', () => {
  it('1. Strips diacritics and accents while converting to lowercase', () => {
    assert.equal(normalizeStr('Résumé'), 'resume');
    assert.equal(normalizeStr('RÉSUMÉ'), 'resume');
    assert.equal(normalizeStr('Café'), 'cafe');
    assert.equal(normalizeStr('über'), 'uber');
    assert.equal(normalizeStr('façade'), 'facade');
    assert.equal(normalizeStr('naïve'), 'naive');
    assert.equal(normalizeStr('piñata'), 'pinata');
  });

  it('2. Handles null, undefined, numbers, and empty strings gracefully', () => {
    assert.equal(normalizeStr(null), '');
    assert.equal(normalizeStr(undefined), '');
    assert.equal(normalizeStr(''), '');
    assert.equal(normalizeStr(12345), '12345');
    assert.equal(normalizeStr(0), '0');
  });

  it('3. fuzzyIncludes matches search queries regardless of accent differences in query or target', () => {
    const courseTitle = 'Java Résumé & Interview Prep';
    
    // Unaccented query matches accented title
    assert.equal(fuzzyIncludes(courseTitle, 'resume'), true);
    assert.equal(fuzzyIncludes(courseTitle, 'interview'), true);
    assert.equal(fuzzyIncludes(courseTitle, 'java'), true);

    // Accented query matches unaccented title
    assert.equal(fuzzyIncludes('Java Resume & Interview', 'résumé'), true);

    // Mixed case & accents match
    assert.equal(fuzzyIncludes('Advanced Microservices Architecture', 'microservices'), true);
    assert.equal(fuzzyIncludes('Déjà vu in Software Design', 'deja'), true);

    // Non-matching query returns false
    assert.equal(fuzzyIncludes(courseTitle, 'python'), false);
    assert.equal(fuzzyIncludes(courseTitle, 'docker'), false);
  });

  it('4. Simulates CommandPalette section & lecture filtering with diacritics', () => {
    const lectures = [
      { id: 'l1', title: 'Building a Winning Tech Résumé' },
      { id: 'l2', title: 'Object-Oriented Programming Deep Dive' },
      { id: 'l3', title: 'Data Structures: Déque and Priority Queues' },
    ];

    const search = (q) => {
      const normQ = normalizeStr(q.trim());
      return lectures.filter(l => !normQ || normalizeStr(l.title).includes(normQ));
    };

    // Searching 'resume' matches 'Building a Winning Tech Résumé'
    const resumeMatches = search('resume');
    assert.equal(resumeMatches.length, 1);
    assert.equal(resumeMatches[0].id, 'l1');

    // Searching 'deque' matches 'Data Structures: Déque and Priority Queues'
    const dequeMatches = search('deque');
    assert.equal(dequeMatches.length, 1);
    assert.equal(dequeMatches[0].id, 'l3');

    // Searching 'DÉQUE' matches as well
    const upperDequeMatches = search('DÉQUE');
    assert.equal(upperDequeMatches.length, 1);
    assert.equal(upperDequeMatches[0].id, 'l3');
  });
});
