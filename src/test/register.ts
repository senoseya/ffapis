import { FreeFireAPI } from '@/index';
import { getErrorMessage } from '@/types';

function generateRandomNickname(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'Test';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function testRegister(): Promise<void> {
  console.log('Starting Register Test...');
  const api = new FreeFireAPI();
  const region = process.argv[2] || 'IND';
  const nickname = process.argv[3] || generateRandomNickname();

  try {
    console.log(`Registering new account in region: ${region}`);
    console.log(`Using nickname: ${nickname}`);

    const account = await api.register(region, nickname);

    console.log('\n--- Registration Success ---');
    console.log(`UID: ${account.uid}`);
    console.log(`Password: ${account.password}`);
    console.log(`Region: ${account.region}`);
    console.log(`Nickname: ${account.nickname}`);

    console.log('\n--- Account Configuration (JSON) ---');
    console.log(JSON.stringify({ uid: account.uid, password: account.password, region: account.region }, null, 2));
  } catch (e) {
    console.error('\n[!] Registration failed:', getErrorMessage(e));
  }
}

testRegister();
