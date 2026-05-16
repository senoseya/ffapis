import { FreeFireAIToolHandler, freefireTools } from '../src/index';
import type { AIToolCall } from '../src/lib/ai-handler';

async function runTool(name: string, args: Record<string, unknown>): Promise<void> {
  console.log(`\n=== ${name} ===`);
  console.log('Args:', JSON.stringify(args));

  const handler = new FreeFireAIToolHandler();
  const toolCall: AIToolCall = {
    id: `test_${name}`,
    type: 'function',
    function: {
      name,
      arguments: JSON.stringify(args)
    }
  };

  const result = await handler.execute(toolCall);
  console.log('Result:', result.content.substring(0, 500));
}

async function main() {
  const keyword = process.argv[2] || 'FannBot';

  await runTool('search_player', { keyword });

  const testUid = '7512027025';

  await runTool('get_player_profile', { uid: testUid });

  await runTool('get_player_items', { uid: testUid });

  await runTool('get_player_stats', { uid: testUid, mode: 'br', matchType: 'career' });

  await runTool('get_player_stats', { uid: testUid, mode: 'cs', matchType: 'career' });

  console.log('\n=== All tests completed ===');
}

main().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
