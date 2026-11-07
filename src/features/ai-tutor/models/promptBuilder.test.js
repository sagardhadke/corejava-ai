import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  sanitizeXmlForPrompt,
  buildFullPrompt,
  buildShortPrompt,
  calculateUrlLength,
  preparePlatformUrl,
} from './promptBuilder.js';
import { AI_PLATFORMS, DEFAULT_MAX_URL_LENGTH } from './aiPlatforms.js';

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

  describe('sanitizeXmlForPrompt', () => {
    it('escapes triple backticks inside XML so it cannot break markdown code blocks', () => {
      const xml = '<course><title>```break```</title></course>';
      expect(sanitizeXmlForPrompt(xml)).toBe("<course><title>'''break'''</title></course>");
    });
  });

  describe('buildFullPrompt', () => {
    it('builds a topic-scoped prompt with tutor role, topic details, and XML context block', () => {
      const prompt = buildFullPrompt({
        course: sampleCourse,
        scopeType: 'topic',
        section: sampleCourse.sections[0],
        lecture: sampleCourse.sections[0].lectures[0],
      });

      expect(prompt).toContain('You are an expert AI tutor for the course "Core Java with AI".');
      expect(prompt).toContain('Scope: Single Topic / Lecture — "JVM Architecture"');
      expect(prompt).toContain('- Belongs to Section: 01 — "Java Fundamentals"');
      expect(prompt).toContain('- Lecture Duration: 25m');
      expect(prompt).toContain('```xml');
      expect(prompt).toContain('<title>Core Java with AI</title>');
      expect(prompt).toContain('```');
      expect(prompt).toContain('Instructions for the tutor:');
      expect(prompt).toContain('Provide a clear, comprehensive, and intuitive explanation of "JVM Architecture".');
    });

    it('builds a section-scoped prompt listing section topics and full XML', () => {
      const prompt = buildFullPrompt({
        course: sampleCourse,
        scopeType: 'section',
        section: sampleCourse.sections[0],
      });

      expect(prompt).toContain('Scope: Entire Section — Section 01: Java Fundamentals');
      expect(prompt).toContain('Total Lectures in Section: 2');
      expect(prompt).toContain('1. JVM Architecture (25m)');
      expect(prompt).toContain('2. Memory Management (30m)');
      expect(prompt).toContain('```xml');
    });

    it('handles empty or missing parameters safely', () => {
      const prompt = buildFullPrompt();
      expect(prompt).toContain('You are an expert AI tutor for the course "Course".');
      expect(prompt).toContain('```xml');
    });
  });

  describe('buildShortPrompt', () => {
    it('builds concise fallback prompt referencing clipboard and specific topic', () => {
      const shortPrompt = buildShortPrompt({
        platform: AI_PLATFORMS.chatgpt,
        course: sampleCourse,
        scopeType: 'topic',
        section: sampleCourse.sections[0],
        lecture: sampleCourse.sections[0].lectures[0],
      });

      expect(shortPrompt).toContain('I copied my course context');
      expect(shortPrompt).toContain('JVM Architecture');
      expect(shortPrompt).toContain('Core Java with AI');
    });

    it('builds concise fallback prompt for an entire section', () => {
      const shortPrompt = buildShortPrompt({
        platform: AI_PLATFORMS.claude,
        course: sampleCourse,
        scopeType: 'section',
        section: sampleCourse.sections[0],
      });

      expect(shortPrompt).toContain('Section 01 (Java Fundamentals)');
    });
  });

  describe('calculateUrlLength', () => {
    it('calculates the exact encoded length', () => {
      const baseUrl = 'https://chatgpt.com/';
      const param = 'q';
      const prompt = 'Hello World';
      const len = calculateUrlLength(baseUrl, param, prompt);
      // https://chatgpt.com/?q=Hello%20World -> 34 chars
      expect(len).toBe('https://chatgpt.com/?q=Hello%20World'.length);
    });
  });

  describe('preparePlatformUrl & threshold logic', () => {
    it('uses full prompt when URL length is under threshold', () => {
      // Set very large threshold to force under-threshold behavior
      const plan = preparePlatformUrl({
        platform: AI_PLATFORMS.chatgpt,
        course: sampleCourse,
        scopeType: 'topic',
        section: sampleCourse.sections[0],
        lecture: sampleCourse.sections[0].lectures[0],
        maxUrlLength: 100000,
      });

      expect(plan.isOverThreshold).toBe(false);
      expect(plan.promptToUse).toBe(plan.fullPrompt);
      expect(plan.url).toContain(encodeURIComponent('You are an expert AI tutor'));
    });

    it('switches to short prompt when full prompt exceeds threshold', () => {
      // Small threshold (e.g. 500 chars) guarantees full prompt exceeds it
      const plan = preparePlatformUrl({
        platform: AI_PLATFORMS.claude,
        course: sampleCourse,
        scopeType: 'topic',
        section: sampleCourse.sections[0],
        lecture: sampleCourse.sections[0].lectures[0],
        maxUrlLength: 500,
      });

      expect(plan.isOverThreshold).toBe(true);
      expect(plan.promptToUse).toBe(plan.shortPrompt);
      expect(plan.url).toContain('https://claude.ai/new?q=');
      expect(plan.url).toContain(encodeURIComponent('I copied my course context'));
      expect(plan.fullPrompt).toContain('```xml');
    });

    it('works with default threshold constant', () => {
      expect(DEFAULT_MAX_URL_LENGTH).toBe(2000);
      const plan = preparePlatformUrl({
        platform: AI_PLATFORMS.chatgpt,
        course: sampleCourse,
        scopeType: 'topic',
        section: sampleCourse.sections[0],
        lecture: sampleCourse.sections[0].lectures[0],
      });
      // The full XML with course structure is over 2000 characters
      expect(plan.isOverThreshold).toBe(true);
      expect(plan.promptToUse).toBe(plan.shortPrompt);
    });
  });
});

