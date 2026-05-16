import { FreeFireAPI } from '../src/index';
import { getErrorMessage } from '../src/types';

async function testItems(): Promise<void> {
  const targetUid = process.argv[2] || '12345678';
  console.log(`Starting Items Test for UID: ${targetUid}...`);

  const api = new FreeFireAPI();
  try {
    console.log('Getting Player Items...');
    const items = await api.getPlayerItems(targetUid);

    if (items) {
      const itemList = items.items;
      console.log('\n--- Summary ---');
      console.log(`Nickname: ${items.basic_info.nickname}`);
      console.log(`UID: ${items.basic_info.accountid}`);
      console.log(`Outfit Items: ${itemList.outfit.length}`);

      if (itemList.weapons.shown_skins.length > 0) {
        console.log(`Weapon Items: ${itemList.weapons.shown_skins.length}`);
      }

      if (itemList.skills.equipped.length > 0) {
        console.log(`Skills Equipped: ${itemList.skills.equipped.length}`);
        console.log(`Skills: ${itemList.skills.equipped.map((s) => s.id).join(', ')}`);
      }

      if (itemList.pet) {
        console.log(`Pet Name: ${itemList.pet.name || 'None'}`);
        if (itemList.pet.id) console.log(`Pet ID: ${itemList.pet.id.name || itemList.pet.id.id}`);
      } else {
        console.log('Pet: None');
      }

      if (itemList.outfit.length > 0) {
        console.log('\n--- First 5 Outfits ---');
        itemList.outfit.slice(0, 5).forEach((i) => {
          console.log(`- ${i.name || 'Unknown'} (ID: ${i.id})`);
        });
      }
    } else {
      console.log('Items fetch failed or empty.');
    }
  } catch (e) {
    console.error('Items test failed:', getErrorMessage(e));
  }
}

testItems();
