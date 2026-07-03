import { getFormattedAFKMessage } from '../services/afkService.js';

// In your message event handler
export async function checkUserAFKStatus(client, message) {
  if (!message.guild) return null;
  
  const afkMessage = await getFormattedAFKMessage(
    client,
    message.guildId,
    message.author.id
  );
  
  if (afkMessage) {
    await message.reply(afkMessage).catch(() => {});
  }
  
  return afkMessage;
}
