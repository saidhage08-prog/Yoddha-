// In your message event handler
import { getAFKMessage } from '../../utils/afkUtils.js';

// After checking if message is valid
const afkMessage = await getAFKMessage(client, message.guildId, message.author.id);
if (afkMessage) {
  await message.reply(afkMessage);
}
