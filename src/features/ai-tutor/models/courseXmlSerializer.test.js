import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  escapeXml,
  courseToXml,
  courseToMarkdown,
  downloadCourseXml,
  downloadCourseContextFile,
} from './courseXmlSerializer.js';

describe('courseXmlSerializer', () => {
  const sampleCourse = {
    title: 'Core Java with AI & Concurrency',
    sections: [
      {
        id: 'sec-1',
        number: '01',
        title: 'Introduction & Setup',
        isProject: false,
        lectures: [
          { id: 'lec-1', title: 'JDK Installation <v21>', durationSec: 900, durationLabel: '15m' },
          { id: 'lec-2', title: 'Hello World "Special"', durationSec: 1200, durationLabel: '20m' },
        ],
      },
      {
        id: 'sec-2',
        number: '02',
        title: 'Final Project',
        isProject: true,
        lectures: [
          { id: 'lec-3', title: 'Building a CLI App', durationSec: 3600, durationLabel: '1h' },
        ],
      },
    ],
  };

  describe('escapeXml', () => {
    it('escapes &, <, >, ", and single quotes correctly', () => {
      const raw = 'Java & Python < "Hello" & \'World\' >';
      expect(escapeXml(raw)).toBe('Java &amp; Python &lt; &quot;Hello&quot; &amp; &apos;World&apos; &gt;');
    });

    it('returns empty string for null and undefined', () => {
      expect(escapeXml(null)).toBe('');
      expect(escapeXml(undefined)).toBe('');
    });
  });

  describe('courseToXml', () => {
    it('produces valid canonical XML conforming to course structure', () => {
      const xml = courseToXml(sampleCourse);
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<title>Core Java with AI &amp; Concurrency</title>');
      expect(xml).toContain('<section number="01" title="Introduction &amp; Setup">');
      expect(xml).toContain('<item type="video" title="JDK Installation &lt;v21&gt;" duration="15m" />');
      expect(xml).toContain('<section number="02" title="Final Project" project="true">');
    });

    it('returns fallback valid XML for null course', () => {
      const xml = courseToXml(null);
      expect(xml).toContain('<title>Course</title>');
      expect(xml).toContain('<sections/>');
    });
  });

  describe('courseToMarkdown', () => {
    it('generates a clean markdown context document for LLMs', () => {
      const md = courseToMarkdown(sampleCourse, {
        selectedLectures: [sampleCourse.sections[0].lectures[0]],
      });

      expect(md).toContain('# Course Context: Core Java with AI & Concurrency');
      expect(md).toContain('## ⭐ Selected Focus Topics for Current Session');
      expect(md).toContain('JDK Installation <v21>');
      expect(md).toContain('## Full Curriculum Roadmap');
      expect(md).toContain('### Section 01: Introduction & Setup');
      expect(md).toContain('👉 Lecture 1: JDK Installation <v21> (15m) **[SELECTED]**');
    });
  });

  describe('downloadCourseXml & downloadCourseContextFile', () => {
    let originalCreateObjectURL;
    let originalRevokeObjectURL;

    beforeEach(() => {
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      URL.revokeObjectURL = vi.fn();
    });

    it('triggers XML file download in browser environment', () => {
      const appendSpy = vi.spyOn(document.body, 'appendChild');
      const filename = downloadCourseXml(sampleCourse);

      expect(filename).toContain('.xml');
      expect(appendSpy).toHaveBeenCalled();
    });

    it('triggers Markdown context file download', () => {
      const appendSpy = vi.spyOn(document.body, 'appendChild');
      const filename = downloadCourseContextFile(sampleCourse, { format: 'markdown' });

      expect(filename).toContain('-context.md');
      expect(appendSpy).toHaveBeenCalled();
    });
  });
});
