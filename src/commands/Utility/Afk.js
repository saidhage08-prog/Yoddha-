import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getAFKKey } from '../../utils/database.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const data = new SlashCommandBuilder()
  .setName('afk')
  .setDescription('Set your AFK status with a reason')
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Why are you going AFK?')
      .setRequired(false)
      .setMaxLength(100)
  )
  .addNumberOption(option =>
    option
      .setName('duration')
      .setDescription('How many minutes will you be AFK? (Leave empty for indefinite)')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(1440) // 24 hours max
  );

// Shared logic for setting AFK status
async function setAFKStatusLogic(client, guildId, userId, reason, duration) {
  try {
    if (!client.db) {
      logger.warn('Database not available for setting AFK status');
      return null;
    }

    const afkKey = getAFKKey(guildId, userId);
    
    let expiresAt = null;
    if (duration) {
      expiresAt = new Date(Date.now() + duration * 60 * 1000).toISOString();
    }

    const afkData = {
      reason,
      status_at: new Date().toISOString(),
      expires_at: expiresAt,
      userId,
      guildId
    };

    await client.db.set(afkKey, afkData);
    logger.info(`Set AFK status for user ${userId} in guild ${guildId}`, {
      reason,
      duration,
      expiresAt
    });

    return afkData;
  } catch (error) {
    logger.error(`Error setting AFK status for user ${userId}:`, error);
    return null;
  }
}

// Shared embed creation
function createAFKEmbed(reason, duration, success = true) {
  if (success) {
    return new EmbedBuilder()
      .setColor('#4CAF50')
      .setTitle('✅ AFK Status Set')
      .setDescription(`You are now marked as AFK`)
      .addFields(
        { name: 'Reason', value: reason, inline: false },
        { 
          name: 'Duration', 
          value: duration ? `${duration} minutes` : 'Indefinite', 
          inline: false 
        }
      )
      .setTimestamp();
  } else {
    return new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('❌ Error')
      .setDescription('Failed to set AFK status. Please try again later.')
      .setTimestamp();
  }
}

// Slash Command Handler
async function execute(interaction) {
  try {
    await InteractionHelper.safeDefer(interaction);

    const reason = interaction.options.getString('reason') || 'No reason provided';
    const duration = interaction.options.getNumber('duration');
    
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    const result = await setAFKStatusLogic(interaction.client, guildId, userId, reason, duration);
    
    const embed = createAFKEmbed(reason, duration, result !== null);
    await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });

  } catch (error) {
    logger.error('Error executing AFK slash command:', error);
    
    const errorEmbed = createAFKEmbed(null, null, false);
    if (interaction.deferred) {
      await InteractionHelper.safeEditReply(interaction, { embeds: [errorEmbed] });
    } else {
      await InteractionHelper.safeReply(interaction, { embeds: [errorEmbed], ephemeral: true });
    }
  }
}

// Prefix Command Handler
async function prefixExecute(message, args, client) {
  try {
    let reason = 'No reason provided';
    let duration = null;

    // Parse arguments: !afk [duration] [reason...]
    // Example: !afk 30 In a meeting or !afk BRB or !afk
    if (args.length > 0) {
      const firstArg = args[0];
      
      // Check if first arg is a number (duration)
      if (!isNaN(firstArg)) {
        duration = parseInt(firstArg);
        if (duration <= 0 || duration > 1440) {
          await message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❌ Invalid Duration')
                .setDescription('Duration must be between 1 and 1440 minutes (24 hours).')
                .setTimestamp()
            ]
          });
          return;
        }
        // Rest of args are reason
        reason = args.slice(1).join(' ') || 'No reason provided';
      } else {
        // All args are reason (no duration specified)
        reason = args.join(' ');
      }
    }

    // Limit reason length
    if (reason.length > 100) {
      reason = reason.substring(0, 100);
    }

    const guildId = message.guildId;
    const userId = message.author.id;

    const result = await setAFKStatusLogic(client, guildId, userId, reason, duration);
    
    const embed = createAFKEmbed(reason, duration, result !== null);
    await message.reply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error executing AFK prefix command:', error);
    
    const errorEmbed = createAFKEmbed(null, null, false);
    await message.reply({ embeds: [errorEmbed] });
  }
}

export default { data, execute, prefixExecute };
