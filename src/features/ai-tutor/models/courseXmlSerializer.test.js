import { describe, it, expect, vi } from 'vitest';
import {
  escapeXml,
  courseToXml,
  downloadCourseXml,
} from './courseXmlSerializer.js';

describe('courseXmlSerializer', () => {
  describe('escapeXml', () => {
    it('escapes &, <, >, ", and single quotes correctly', () => {
      const input = 'Spring & "Boot" <Fast> \'Core\'';
      expect(escapeXml(input)).toBe('Spring &amp; &quot;Boot&quot; &lt;Fast&gt; &apos;Core&apos;');
    });

    it('handles null and undefined gracefully', () => {
      expect(escapeXml(null)).toBe('');
      expect(escapeXml(undefined)).toBe('');
    });

    it('preserves unicode and emojis', () => {
      expect(escapeXml('Java 🚀 & AI 🤖')).toBe('Java 🚀 &amp; AI 🤖');
    });
  });

  describe('courseToXml', () => {
    it('produces valid course XML matching parser schema', () => {
      const course = {
        title: 'Core Java & AI',
        sections: [
          {
            number: '01',
            title: 'Fundamentals <Basics>',
            isProject: false,
            lectures: [
              { title: 'Intro & Setup', durationLabel: '15m', durationSec: 900 },
              { title: 'Variables & Types', durationLabel: '20m', durationSec: 1200 },
            ],
          },
          {
            number: '02',
            title: 'Hands-on Project',
            isProject: true,
            lectures: [
              { title: 'Build CLI App', durationLabel: '45m', durationSec: 2700 },
            ],
          },
        ],
      };

      const xml = courseToXml(course);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<title>Core Java &amp; AI</title>');
      expect(xml).toContain('<section number="01" title="Fundamentals &lt;Basics&gt;">');
      expect(xml).toContain('<section number="02" title="Hands-on Project" project="true">');
      expect(xml).toContain('<item type="video" title="Intro &amp; Setup" duration="15m" />');
      expect(xml).toContain('<item type="video" title="Build CLI App" duration="45m" />');

      // Verify DOMParser parses it without error
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'application/xml');
      expect(doc.querySelector('parsererror')).toBeNull();
      expect(doc.querySelector('course > title').textContent).toBe('Core Java & AI');
      expect(doc.querySelectorAll('sections > section')).toHaveLength(2);
    });

    it('handles null course without throwing', () => {
      const xml = courseToXml(null);
      expect(xml).toContain('<course>');
      expect(xml).toContain('</course>');
    });

    it('handles course with empty sections or empty lectures', () => {
      const course = { title: 'Empty Course', sections: [] };
      const xml = courseToXml(course);
      expect(xml).toContain('<title>Empty Course</title>');
      expect(xml).toContain('</sections>');
    });
  });

  describe('downloadCourseXml', () => {
    it('creates Blob and triggers download link click', () => {
      const course = { title: 'Python Pro', sections: [] };
      const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
      const revokeObjectURLMock = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLMock;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock;

      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      const filename = downloadCourseXml(course);

      expect(filename).toBe('python-pro-structure.xml');
      expect(createObjectURLMock).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
    });
  });
});

