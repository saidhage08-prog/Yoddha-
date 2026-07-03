import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getAFKKey } from '../../utils/database.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('unafk')
  .setDescription('Remove your AFK status');

export async function execute(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    // Delete AFK status from database
    const afkKey = getAFKKey(guildId, userId);
    await interaction.client.db.delete(afkKey);

    // Create success embed
    const embed = new EmbedBuilder()
      .setColor('#4CAF50')
      .setTitle('✅ AFK Status Removed')
      .setDescription('You are no longer marked as AFK')
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    logger.info(`User ${userId} removed AFK status in guild ${guildId}`);

  } catch (error) {
    logger.error('Error executing UnAFK command:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('❌ Error')
      .setDescription('Failed to remove AFK status. Please try again later.')
      .setTimestamp();

    if (interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}

// Prefix Command Handler
export async function prefixExecute(message, args, client) {
  try {
    const guildId = message.guildId;
    const userId = message.author.id;

    // Delete AFK status from database
    const afkKey = getAFKKey(guildId, userId);
    await client.db.delete(afkKey);

    // Create success embed
    const embed = new EmbedBuilder()
      .setColor('#4CAF50')
      .setTitle('✅ AFK Status Removed')
      .setDescription('You are no longer marked as AFK')
      .setTimestamp();

    await message.reply({ embeds: [embed] });

    logger.info(`User ${userId} removed AFK status in guild ${guildId}`);

  } catch (error) {
    logger.error('Error executing UnAFK prefix command:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('❌ Error')
      .setDescription('Failed to remove AFK status. Please try again later.')
      .setTimestamp();

    await message.reply({ embeds: [errorEmbed] });
  }
}

export default { data, execute, prefixExecute };
