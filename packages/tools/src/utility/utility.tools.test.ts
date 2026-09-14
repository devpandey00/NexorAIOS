import { describe, expect, it } from 'vitest';
import { calculatorTool, jsonTool, urlTool, textTool, hashTool, base64Tool } from './utility.tools.js';

describe('utility tools',()=>{
 it('calculates safely',async()=>expect((await calculatorTool.execute({expression:'(10+5)*2'})).data).toEqual({expression:'(10+5)*2',result:30}));
 it('parses json paths',async()=>expect((await jsonTool.execute({json:'{"lead":{"score":92}}',path:'lead.score'})).data).toEqual({value:92}));
 it('parses urls',async()=>expect((await urlTool.execute({url:'https://example.com/a?x=1'})).data).toMatchObject({hostname:'example.com',pathname:'/a',query:{x:'1'}}));
 it('transforms text',async()=>expect((await textTool.execute({text:'Hello World!',operation:'slug'})).data).toBe('hello-world'));
 it('hashes deterministically',async()=>expect((await hashTool.execute({text:'test',algorithm:'sha256'})).data).toMatchObject({algorithm:'sha256'}));
 it('round trips base64',async()=>{const e=await base64Tool.execute({value:'Nexor',operation:'encode'}); const d=await base64Tool.execute({value:(e.data as any).base64,operation:'decode'}); expect((d.data as any).text).toBe('Nexor');});
});
