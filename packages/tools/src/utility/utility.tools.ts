import { createHash } from 'node:crypto';
import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';

const ok = (data: unknown): ToolOutput => ({ success: true, data });
const fail = (message: string): ToolOutput => ({ success: false, error: message });
const text = (v: unknown) => (typeof v === 'string' ? v : String(v ?? ''));

function tool(id: string, name: string, description: string, execute: (input: ToolInput) => Promise<ToolOutput>): Tool {
  return { id, name, description, category: 'productivity', execute };
}

export const calculatorTool = tool('calculator', 'Calculator', 'Evaluate safe arithmetic expressions without executing JavaScript.', async (input) => {
  const expression = text(input.expression).replace(/\s+/g, '');
  if (!expression || !/^[0-9+\-*/().%]+$/.test(expression)) return fail('Expression contains unsupported characters.');
  const tokens = expression.match(/\d+(?:\.\d+)?|[+\-*/%()]|$/g)?.filter(Boolean) ?? [];
  const values: number[] = [], ops: string[] = [];
  const precedence = (op: string) => (op === '+' || op === '-' ? 1 : 2);
  const apply = () => { const op = ops.pop(); const b = values.pop(); const a = values.pop(); if (!op || a === undefined || b === undefined) throw new Error('Invalid expression'); if (op === '/' && b === 0) throw new Error('Division by zero'); values.push(op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : op === '/' ? a / b : a % b); };
  try { for (let i = 0; i < tokens.length; i++) { const t = tokens[i]; if (/^\d/.test(t)) values.push(Number(t)); else if (t === '(') ops.push(t); else if (t === ')') { while (ops.at(-1) !== '(') apply(); if (ops.pop() !== '(') throw new Error('Mismatched parentheses'); } else { if (t === '-' && (i === 0 || ['+','-','*','/','%','('].includes(tokens[i - 1]))) values.push(0); while (ops.length && ops.at(-1) !== '(' && precedence(ops.at(-1)!) >= precedence(t)) apply(); ops.push(t); } } while (ops.length) { if (ops.at(-1) === '(') throw new Error('Mismatched parentheses'); apply(); } if (values.length !== 1 || !Number.isFinite(values[0])) throw new Error('Invalid expression'); return ok({ expression, result: values[0] }); } catch (e) { return fail(e instanceof Error ? e.message : 'Invalid expression'); }
});

export const textTool = tool('text-utils', 'Text Utilities', 'Clean, analyze, transform and summarize text.', async (input) => { const value = text(input.text); const words = value.trim() ? value.trim().split(/\s+/) : []; const op = text(input.operation || 'stats'); if (op === 'upper') return ok(value.toUpperCase()); if (op === 'lower') return ok(value.toLowerCase()); if (op === 'slug') return ok(value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); if (op === 'stats') return ok({ characters: value.length, charactersNoSpaces: value.replace(/\s/g, '').length, words: words.length, lines: value ? value.split(/\r?\n/).length : 0 }); return fail('Unsupported operation.'); });

export const jsonTool = tool('json-utils', 'JSON Utilities', 'Parse, validate, pretty-print and extract JSON values.', async (input) => { try { const parsed = typeof input.json === 'string' ? JSON.parse(input.json) : input.json; if (input.path) { const value = text(input.path).split('.').filter(Boolean).reduce((acc: any, key) => acc?.[key], parsed); return ok({ value }); } return ok({ valid: true, json: JSON.stringify(parsed, null, Number(input.indent ?? 2)) }); } catch (e) { return fail(e instanceof Error ? e.message : 'Invalid JSON'); } });

export const urlTool = tool('url-utils', 'URL Parser', 'Parse URLs into protocol, host, path, query and fragments.', async (input) => { try { const u = new URL(text(input.url)); return ok({ href: u.href, protocol: u.protocol.replace(':',''), host: u.host, hostname: u.hostname, port: u.port || null, pathname: u.pathname, search: u.search, query: Object.fromEntries(u.searchParams), hash: u.hash.replace(/^#/, '') || null }); } catch { return fail('Invalid URL.'); } });

export const regexTool = tool('regex-extractor', 'Regex Extractor', 'Extract matches from text using a supplied regular expression.', async (input) => { try { const flags = text(input.flags || 'g'); const re = new RegExp(text(input.pattern), flags.includes('g') ? flags : `${flags}g`); return ok({ matches: [...text(input.text).matchAll(re)].map(m => ({ match: m[0], groups: m.slice(1) })) }); } catch { return fail('Invalid regular expression.'); } });

export const hashTool = tool('hash', 'Hash Generator', 'Generate cryptographic hashes for text data.', async (input) => { const algorithm = text(input.algorithm || 'sha256').toLowerCase(); if (!['sha256','sha1','md5'].includes(algorithm)) return fail('Unsupported hash algorithm.'); return ok({ algorithm, hash: createHash(algorithm).update(text(input.text)).digest('hex') }); });

export const base64Tool = tool('base64', 'Base64 Encoder', 'Encode or decode UTF-8 text as Base64.', async (input) => { try { const mode = text(input.operation || 'encode'); if (mode === 'decode') return ok({ text: Buffer.from(text(input.value), 'base64').toString('utf8') }); return ok({ base64: Buffer.from(text(input.value), 'utf8').toString('base64') }); } catch { return fail('Invalid Base64 data.'); } });

export const csvTool = tool('csv-utils', 'CSV Utilities', 'Parse simple CSV text into structured rows and columns.', async (input) => { const source = text(input.csv).trim(); if (!source) return ok({ columns: [], rows: [] }); const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false; for (let i=0;i<source.length;i++) { const c=source[i]; if(c==='"' && source[i+1]==='"' && quoted){cell+='"';i++;} else if(c==='"'){quoted=!quoted;} else if(c===','&&!quoted){row.push(cell);cell='';} else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&source[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';} else cell+=c; } row.push(cell); if(row.length>1||row[0])rows.push(row); const columns=rows.shift() ?? []; return ok({ columns, rows: rows.map(r=>Object.fromEntries(columns.map((c,i)=>[c,r[i] ?? '']))) }); });

export const dateTool = tool('date-utils', 'Date Utilities', 'Convert dates to ISO and calculate date differences.', async (input) => { const a = new Date(text(input.date)); if(Number.isNaN(a.getTime())) return fail('Invalid date.'); if(input.addDays !== undefined){ const days=Number(input.addDays); if(!Number.isFinite(days)) return fail('Invalid addDays.'); a.setUTCDate(a.getUTCDate()+days); } const result: Record<string,unknown>={iso:a.toISOString(),timestamp:a.getTime()}; if(input.compareTo){ const b=new Date(text(input.compareTo)); if(Number.isNaN(b.getTime())) return fail('Invalid compareTo date.'); result.differenceMs=a.getTime()-b.getTime(); result.differenceDays=(a.getTime()-b.getTime())/86400000; } return ok(result); });

export const wordCountTool = tool('word-counter', 'Word Counter', 'Count words, sentences and characters in content.', async (input) => { const v=text(input.text).trim(); return ok({ words:v?v.split(/\s+/).length:0, sentences:v?v.split(/[.!?]+/).filter(Boolean).length:0, characters:v.length, charactersNoSpaces:v.replace(/\s/g,'').length }); });

export const utilityTools: Tool[] = [calculatorTool,textTool,jsonTool,urlTool,regexTool,hashTool,base64Tool,csvTool,dateTool,wordCountTool];
