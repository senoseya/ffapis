import { FreeFireAPI } from '@/index';
import type { PlayerStats } from '@/types';
import { getErrorMessage } from '@/types';

async function testStats(): Promise<void> {
  const targetUid = process.argv[2] || '16207002';
  console.log(`Starting Stats Test for UID: ${targetUid}...`);

  const api = new FreeFireAPI();

  const printStats = (title: string, data: PlayerStats): void => {
    console.log(`\n--- ${title} ---`);
    if (!data) {
      console.log('No data returned.');
      return;
    }
    if (data.solostats) console.log('Solo:', JSON.stringify(data.solostats, (k, v) => (v && v.value ? v.value : v)));
    if (data.duostats) console.log('Duo:', JSON.stringify(data.duostats, (k, v) => (v && v.value ? v.value : v)));
    if (data.quadstats) console.log('Squad:', JSON.stringify(data.quadstats, (k, v) => (v && v.value ? v.value : v)));

    if (!data.solostats && !data.duostats && !data.quadstats) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  };

  try {
    console.log('Fetching BR Career...');
    const brCareer = await api.getPlayerStats(targetUid, 'br', 'career');
    printStats('BR Career', brCareer);

    console.log('Fetching BR Ranked...');
    const brRanked = await api.getPlayerStats(targetUid, 'br', 'ranked');
    printStats('BR Ranked', brRanked);

    console.log('Fetching CS Career...');
    const csCareer = await api.getPlayerStats(targetUid, 'cs', 'career');
    printStats('CS Career', csCareer);

    console.log('Fetching CS Ranked...');
    const csRanked = await api.getPlayerStats(targetUid, 'cs', 'ranked');
    printStats('CS Ranked', csRanked);
  } catch (e) {
    console.error('Stats test failed:', getErrorMessage(e));
  }
}

testStats();
