import { describe, it, expect } from 'vitest';
import {
  parseMentions,
  resolveResponders,
  stripMentions
} from '../src/lib/agents/router.js';
import { listAgents, getAgent } from '../src/lib/agents/definitions.js';

describe('agent router', () => {
  it('parses primary keys', () => {
    expect(parseMentions('@soil hi')).toEqual(['soil']);
    expect(parseMentions('@disease @solar')).toEqual(['disease', 'solar']);
  });

  it('resolves aliases', () => {
    expect(parseMentions('@light help')).toEqual(['solar']);
    expect(parseMentions('@moisture vs @fertility')).toEqual(['soil']);
    expect(parseMentions('@pest seen')).toEqual(['disease']);
  });

  it('ignores unknown mentions', () => {
    expect(parseMentions('@nobody help')).toEqual([]);
  });

  it('defaults to care when no mention', () => {
    expect(resolveResponders('how is it?')).toEqual(['care']);
  });

  it('keeps explicit mentions, de-dupes', () => {
    expect(resolveResponders('@soil @soil ?')).toEqual(['soil']);
  });

  it('strips mention tokens from prompt body', () => {
    expect(stripMentions('@soil hey there')).toBe('hey there');
    expect(stripMentions('hey @disease how about this?')).toBe(
      'hey how about this?'
    );
  });
});

describe('agent definitions', () => {
  it('returns 4 agents with unique keys', () => {
    const all = listAgents();
    expect(all).toHaveLength(4);
    const keys = new Set(all.map((a) => a.key));
    expect(keys.size).toBe(4);
  });

  it('each agent has system prompt and instructions', () => {
    for (const a of listAgents()) {
      expect(a.systemPrompt.length).toBeGreaterThan(100);
      expect(a.initialInstructions.length).toBeGreaterThan(50);
      expect(a.followupInstructions.length).toBeGreaterThan(20);
      expect(a.model).toMatch(/gemini/);
    }
  });

  it('getAgent returns correct agent', () => {
    expect(getAgent('soil').key).toBe('soil');
    expect(getAgent('care').name).toMatch(/Care/);
  });
});
