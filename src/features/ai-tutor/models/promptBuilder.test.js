import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  sanitizeXml,
  buildFullPrompt,
  buildShortPrompt,
  calculateUrlLength,
  preparePlatformUrl,
  buildTopicWiseRoadmap,
  DEVELOPER_ATTRIBUTION,
} from './promptBuilder.js';
import { AI_PLATFORMS } from './aiPlatforms.js';

describe('promptBuilder', () => {
  const sampleCourse = {
    title: 'Core Java with AI',
    sections: [
      {
        id: 's01',
        number: '01',
        title: 'Java Fundamentals',
        lectures: [
          { id: 'l1', title: 'JVM Architecture', durationLabel: '25m', durationSec: 1500 },
          { id: 'l2', title: 'Memory Management', durationLabel: '30m', durationSec: 1800 },
        ],
      },
      {
        id: 's02',
        number: '02',
        title: 'OOP Concepts',
        lectures: [
          { id: 'l3', title: 'Polymorphism in Java', durationLabel: '40m', durationSec: 2400 },
        ],
      },
    ],
  };

  describe('DEVELOPER_ATTRIBUTION', () => {
    it('contains Sagar Dhadke and GitHub link', () => {
      expect(DEVELOPER_ATTRIBUTION.name).toBe('Sagar Dhadke');
      expect(DEVELOPER_ATTRIBUTION.github).toBe('https://github.com/sagardhadke');
      expect(DEVELOPER_ATTRIBUTION.platformName).toBe('Java Course Tracker');
    });
  });

  describe('sanitizeText', () => {
    it('strips dangerous HTML tags such as script and iframe', () => {
      const malicious = '<script>alert("hack")</script>Introduction to Java <iframe src="evil.com"></iframe>';
      expect(sanitizeText(malicious)).toBe('alert("hack")Introduction to Java');
    });

    it('neutralizes markdown code fence breakouts', () => {
      const breakOut = 'Lecture Title ``` DROP TABLE users; ```';
      expect(sanitizeText(breakOut)).toBe("Lecture Title ''' DROP TABLE users; '''");
    });

    it('strips control characters while preserving valid newlines and tabs', () => {
      const textWithControls = 'Title\x00\x07With\x1FControls\nNext\tLine';
      expect(sanitizeText(textWithControls)).toBe('TitleWithControls\nNext\tLine');
    });

    it('handles null and undefined gracefully', () => {
      expect(sanitizeText(null)).toBe('');
      expect(sanitizeText(undefined)).toBe('');
    });
  });

  describe('sanitizeXml', () => {
    it('escapes triple backticks inside XML so it cannot break markdown code blocks', () => {
      const xml = '<course><title>```break```</title></course>';
      expect(sanitizeXml(xml)).not.toContain('```');
      expect(sanitizeXml(xml)).toContain("'''break'''");
    });
  });

  describe('buildTopicWiseRoadmap', () => {
    it('builds a topic-wise outline of course sections with selected lecture flags', () => {
      const outline = buildTopicWiseRoadmap(sampleCourse, [sampleCourse.sections[0].lectures[0]]);
      expect(outline).toContain('Section 01: Java Fundamentals');
      expect(outline).toContain('👉 [SELECTED] Lecture 1: JVM Architecture (25m)');
      expect(outline).toContain('Section 02: OOP Concepts');
    });
  });

  describe('buildFullPrompt', () => {
    it('embeds developer attribution and platform context', () => {
      const prompt = buildFullPrompt({
        course: sampleCourse,
        scopeType: 'multi-lecture',
        selectedLectures: [sampleCourse.sections[0].lectures[0]],
      });

      expect(prompt).toContain('Sagar Dhadke');
      expect(prompt).toContain('https://github.com/sagardhadke');
      expect(prompt).toContain('Java Course Tracker');
      expect(prompt).toContain('Scope: 1 Selected Topic / Lecture(s)');
      expect(prompt).toContain('"JVM Architecture"');
    });

    it('builds a prompt for multiple selected lectures topic-wise', () => {
      const selected = [
        sampleCourse.sections[0].lectures[0],
        sampleCourse.sections[0].lectures[1],
      ];
      const prompt = buildFullPrompt({
        course: sampleCourse,
        scopeType: 'multi-lecture',
        selectedLectures: selected,
        contextMode: 'focused',
      });

      expect(prompt).toContain('Scope: 2 Selected Topic / Lecture(s)');
      expect(prompt).toContain('1. "JVM Architecture"');
      expect(prompt).toContain('2. "Memory Management"');
    });

    it('builds a prompt for multiple selected sections', () => {
      const prompt = buildFullPrompt({
        course: sampleCourse,
        scopeType: 'multi-section',
        selectedSections: sampleCourse.sections,
        contextMode: 'focused',
      });

      expect(prompt).toContain('Scope: 2 Course Section(s)');
      expect(prompt).toContain('Section 01: "Java Fundamentals"');
      expect(prompt).toContain('Section 02: "OOP Concepts"');
    });

    it('includes full XML structure when contextMode is full', () => {
      const prompt = buildFullPrompt({
        course: sampleCourse,
        scopeType: 'full-course',
        contextMode: 'full',
      });

      expect(prompt).toContain('Complete Course Structure (XML):');
      expect(prompt).toContain('```xml');
      expect(prompt).toContain('<course>');
    });
  });

  describe('buildShortPrompt', () => {
    it('builds prefilled message for ChatGPT and Claude', () => {
      const shortPrompt = buildShortPrompt({
        platform: AI_PLATFORMS.chatgpt,
        course: sampleCourse,
        scopeType: 'multi-lecture',
        lecture: sampleCourse.sections[0].lectures[0],
      });

      expect(shortPrompt).toContain('JVM Architecture');
      expect(shortPrompt).toContain('Core Java with AI');
    });
  });

  describe('calculateUrlLength and preparePlatformUrl', () => {
    it('calculates the exact URL length with encoding', () => {
      const len = calculateUrlLength('https://chatgpt.com', 'q', 'Hello World & AI');
      expect(len).toBe('https://chatgpt.com?q=Hello%20World%20%26%20AI'.length);
    });

    it('prepares launch plan and marks isOverThreshold when exceeding limit', () => {
      const plan = preparePlatformUrl({
        platform: AI_PLATFORMS.chatgpt,
        course: sampleCourse,
        scopeType: 'full-course',
        contextMode: 'full',
        maxUrlLength: 100,
      });

      expect(plan.isOverThreshold).toBe(true);
      expect(plan.url).toContain(encodeURIComponent(plan.shortPrompt));
    });
  });
});
