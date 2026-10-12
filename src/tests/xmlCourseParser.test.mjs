import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Lightweight DOMParser polyfill for Node.js test environment
class MockElement {
  constructor(tagName, attributes = {}, textContent = '') {
    this.tagName = tagName.toLowerCase();
    this.attributes = attributes;
    this.textContent = textContent;
    this.children = [];
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  querySelector(selector) {
    const list = this.querySelectorAll(selector);
    return list.length > 0 ? list[0] : null;
  }

  querySelectorAll(selector) {
    const cleanSel = selector.trim();
    if (cleanSel === ':scope > title' || cleanSel === 'title') {
      return this.children.filter((c) => c.tagName === 'title');
    }
    if (cleanSel === 'parsererror') {
      return this.children.filter((c) => c.tagName === 'parsererror');
    }
    if (cleanSel === 'course') {
      return this.tagName === 'course' ? [this] : this.children.filter((c) => c.tagName === 'course');
    }
    if (cleanSel === 'sections > section') {
      const sectionsParent = this.children.find((c) => c.tagName === 'sections');
      if (sectionsParent) {
        return sectionsParent.children.filter((c) => c.tagName === 'section');
      }
      return [];
    }
    if (cleanSel === 'items > item') {
      const itemsParent = this.children.find((c) => c.tagName === 'items');
      if (itemsParent) {
        return itemsParent.children.filter((c) => c.tagName === 'item');
      }
      return [];
    }
    return [];
  }
}

class MockDOMParser {
  parseFromString(xmlString, mimeType) {
    const root = new MockElement('#document');
    if (!xmlString || typeof xmlString !== 'string' || !xmlString.includes('<course>')) {
      const err = new MockElement('parsererror', {}, 'Invalid XML structure');
      root.children.push(err);
      return root;
    }

    // Extract course title
    const titleMatch = xmlString.match(/<course[^>]*>[\s\S]*?<title>([\s\S]*?)<\/title>/i);
    const courseTitle = titleMatch ? titleMatch[1].trim() : 'Test Course';
    const courseEl = new MockElement('course');
    courseEl.children.push(new MockElement('title', {}, courseTitle));

    // Extract sections
    const sectionsEl = new MockElement('sections');
    const sectionRegex = /<section\b([^>]*)>([\s\S]*?)<\/section>/gi;
    let sMatch;
    while ((sMatch = sectionRegex.exec(xmlString)) !== null) {
      const rawAttrs = sMatch[1];
      const sectionContent = sMatch[2];
      const attrs = {};
      const attrRegex = /(\w+)="([^"]*)"/g;
      let aMatch;
      while ((aMatch = attrRegex.exec(rawAttrs)) !== null) {
        attrs[aMatch[1]] = aMatch[2];
      }

      const sectionEl = new MockElement('section', attrs);
      const itemsEl = new MockElement('items');
      const itemRegex = /<item\b([^>]*)\/?>/gi;
      let iMatch;
      while ((iMatch = itemRegex.exec(sectionContent)) !== null) {
        const itemAttrs = {};
        const iAttrRegex = /(\w+)="([^"]*)"/g;
        let iaMatch;
        while ((iaMatch = iAttrRegex.exec(iMatch[1])) !== null) {
          itemAttrs[iaMatch[1]] = iaMatch[2];
        }
        itemsEl.children.push(new MockElement('item', itemAttrs));
      }
      sectionEl.children.push(itemsEl);
      sectionsEl.children.push(sectionEl);
    }

    courseEl.children.push(sectionsEl);
    root.children.push(courseEl);
    return root;
  }
}

globalThis.DOMParser = MockDOMParser;

const { parseCourseXml } = await import('../data/xmlCourseParser.js');

describe('XML Course Parser Tests (BUG-XML-03)', () => {
  it('1. Successfully parses standard course XML with sequential section numbers', () => {
    const xml = `
      <course>
        <title>Java Fundamentals</title>
        <sections>
          <section number="01" title="Introduction">
            <items>
              <item type="video" title="Welcome" duration="5m" />
              <item type="video" title="Setup" duration="10m" />
            </items>
          </section>
          <section number="02" title="Variables">
            <items>
              <item type="video" title="Primitives" duration="15m" />
            </items>
          </section>
        </sections>
      </course>
    `;

    const course = parseCourseXml(xml, { idHint: 'java-fundamentals-test' });
    assert.equal(course.id, 'java-fundamentals-test');
    assert.equal(course.title, 'Java Fundamentals');
    assert.equal(course.sections.length, 2);
    assert.equal(course.sections[0].id, 'java-fundamentals-test__s01');
    assert.equal(course.sections[1].id, 'java-fundamentals-test__s02');
    assert.equal(course.sections[0].lectures[0].id, 'java-fundamentals-test__s01_l0');
    assert.equal(course.sections[0].lectures[1].id, 'java-fundamentals-test__s01_l1');
    assert.equal(course.sections[1].lectures[0].id, 'java-fundamentals-test__s02_l0');
    assert.equal(course.lectureCount, 3);
  });

  it('2. BUG-XML-03: Duplicate section numbers in XML generate unique section and lecture IDs', () => {
    // Both sections have number="01", which previously caused lecture ID collision:
    // section 1 lecture 0 was `test__s01_l0` and section 2 lecture 0 was ALSO `test__s01_l0`!
    const duplicateNumberXml = `
      <course>
        <title>Advanced Concurrency</title>
        <sections>
          <section number="01" title="Part A: Threads">
            <items>
              <item type="video" title="Thread Basics" duration="12m" />
              <item type="video" title="Runnable vs Callable" duration="18m" />
            </items>
          </section>
          <section number="01" title="Part B: Synchronization">
            <items>
              <item type="video" title="Intrinsic Locks" duration="20m" />
              <item type="video" title="Atomic Variables" duration="15m" />
            </items>
          </section>
        </sections>
      </course>
    `;

    const course = parseCourseXml(duplicateNumberXml, { idHint: 'concurrency-test' });
    assert.equal(course.sections.length, 2);

    // Display numbers preserve author intent
    assert.equal(course.sections[0].number, '01');
    assert.equal(course.sections[1].number, '01');

    // Section IDs are guaranteed unique
    assert.equal(course.sections[0].id, 'concurrency-test__s01');
    assert.equal(course.sections[1].id, 'concurrency-test__s02');
    assert.notEqual(course.sections[0].id, course.sections[1].id, 'Section IDs must not collide');

    // All lecture IDs are guaranteed unique across the whole course
    const lecture0InPartA = course.sections[0].lectures[0].id;
    const lecture0InPartB = course.sections[1].lectures[0].id;

    assert.equal(lecture0InPartA, 'concurrency-test__s01_l0');
    assert.equal(lecture0InPartB, 'concurrency-test__s02_l0');
    assert.notEqual(lecture0InPartA, lecture0InPartB, 'Lecture IDs in duplicate sections must never collide');

    // Verify all lecture IDs across course are strictly distinct
    const allIds = course.allLectures.map((l) => l.id);
    const uniqueIds = new Set(allIds);
    assert.equal(allIds.length, uniqueIds.size, 'Every lecture ID in the course must be unique');
  });

  it('3. Unnumbered sections default to sequential 2-digit indices without colliding', () => {
    const unnumberedXml = `
      <course>
        <title>Unnumbered Modules</title>
        <sections>
          <section title="Module Alpha">
            <items>
              <item type="video" title="Alpha Intro" duration="10m" />
            </items>
          </section>
          <section title="Module Beta">
            <items>
              <item type="video" title="Beta Intro" duration="10m" />
            </items>
          </section>
        </sections>
      </course>
    `;

    const course = parseCourseXml(unnumberedXml, { idHint: 'unnumbered-test' });
    assert.equal(course.sections[0].number, '01');
    assert.equal(course.sections[1].number, '02');
    assert.equal(course.sections[0].id, 'unnumbered-test__s01');
    assert.equal(course.sections[1].id, 'unnumbered-test__s02');
    assert.equal(course.sections[0].lectures[0].id, 'unnumbered-test__s01_l0');
    assert.equal(course.sections[1].lectures[0].id, 'unnumbered-test__s02_l0');
  });
});
