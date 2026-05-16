import { LikeAPI } from '../src/index';
import { getErrorMessage } from '../src/types';

async function main(): Promise<void> {
  const targetUid = process.argv[2];
  const region = process.argv[3] || 'IND';
  const likeCount = parseInt(process.argv[4]) || 100;

  if (!targetUid) {
    console.log('Usage: node dist/test/like.js <target_uid> [region] [count]');
    console.log('Example: node dist/test/like.js 123456789 IND 100');
    console.log('');
    console.log('Note: Free Fire allows max 100 likes per day from guest accounts');
    process.exit(1);
  }

  console.log('='.repeat(50));
  console.log(' FREE FIRE - AUTO LIKE PROFILE');
  console.log('='.repeat(50));
  console.log(`Target UID: ${targetUid}`);
  console.log(`Region: ${region}`);
  console.log(`Likes to send: ${likeCount}`);
  console.log('');

  const likeApi = new LikeAPI();

  try {
    const result = await likeApi.sendLikes(targetUid, region, likeCount);

    console.log('');
    console.log('='.repeat(50));
    console.log(' RESULT');
    console.log('='.repeat(50));
    console.log(`Success: ${result.successCount}/${likeCount}`);
    console.log(`Failed: ${result.failedCount}`);
    console.log(`Remaining guests: ${result.remainingGuests}`);
    console.log('');
    if (result.message) {
      console.log(result.message);
    }
    console.log('='.repeat(50));
  } catch (error) {
    console.error('Error:', getErrorMessage(error));
    process.exit(1);
  }
}

main();
