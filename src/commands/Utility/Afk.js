import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getAFKKey } from '../../utils/database.js';
import { logger } from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
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

export async function execute(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const reason = interaction.options.getString('reason') || 'No reason provided';
    const duration = interaction.options.getNumber('duration');
    
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    
    // Calculate expiration time
    let expiresAt = null;
    if (duration) {
      expiresAt = new Date(Date.now() + duration * 60 * 1000).toISOString();
    }

    // Prepare AFK data
    const afkData = {
      reason,
      status_at: new Date().toISOString(),
      expires_at: expiresAt,
      userId,
      guildId
    };

    // Store AFK status in database
    const afkKey = getAFKKey(guildId, userId);
    await interaction.client.db.set(afkKey, afkData);

    // Create success embed
    const embed = new EmbedBuilder()
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

    await interaction.editReply({ embeds: [embed] });

    logger.info(`User ${userId} set AFK status in guild ${guildId}`, {
      reason,
      duration,
      expiresAt
    });

  } catch (error) {
    logger.error('Error executing AFK command:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('❌ Error')
      .setDescription('Failed to set AFK status. Please try again later.')
      .setTimestamp();

    if (interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}
