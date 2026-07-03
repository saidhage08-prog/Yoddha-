import { logger } from '../utils/logger.js';
import { getAFKKey } from '../utils/database.js';

/**
 * Scans all AFK statuses in the database and removes expired ones
 * This is called automatically by a cron job every minute
 */
export async function cleanExpiredAFKStatuses(client) {
  try {
    if (!client.db) {
      logger.warn('Database not available for AFK cleanup');
      return;
    }

    let removedCount = 0;
    const now = new Date();

    // Get all guilds the bot is in
    for (const [guildId, guild] of client.guilds.cache) {
      try {
        // Get all members in the guild (or use a cached list if available)
        const members = await guild.members.fetch().catch(() => new Map());

        // Check each member's AFK status
        for (const [userId, member] of members) {
          const afkKey = getAFKKey(guildId, userId);
          
          try {
            const afkData = await client.db.get(afkKey, null);

            if (!afkData) {
              continue; // No AFK status for this user
            }

            // Check if AFK has expired
            if (afkData.expires_at) {
              const expiresAt = new Date(afkData.expires_at);
              
              if (now > expiresAt) {
                // AFK expired, remove it
                await client.db.delete(afkKey);
                removedCount++;
                
                logger.debug(
                  `Auto-removed expired AFK for user ${userId} in guild ${guildId}. ` +
                  `Expired at: ${afkData.expires_at}`
                );

                // Optionally notify the user
                try {
                  await member.send({
                    content: `Your AFK status has been automatically removed! 👋\n` +
                            `**Reason:** Your AFK duration has expired.\n` +
                            `**Original Reason:** ${afkData.reason || 'No reason provided'}`
                  }).catch(() => {
                    // User might have DMs disabled, that's okay
                  });
                } catch (error) {
                  logger.debug(`Could not send AFK expiration DM to user ${userId}: ${error.message}`);
                }
              }
            }
          } catch (error) {
            logger.debug(`Error checking AFK status for user ${userId} in guild ${guildId}:`, error);
          }
        }
      } catch (error) {
        logger.warn(`Error cleaning expired AFK statuses in guild ${guildId}:`, error);
      }
    }

    if (removedCount > 0) {
      logger.info(`AFK Cleanup: Removed ${removedCount} expired AFK status(es)`);
    }
  } catch (error) {
    logger.error('Error in cleanExpiredAFKStatuses:', error);
  }
}

/**
 * Get AFK status with automatic expiration check
 * This prevents showing expired AFK statuses
 */
export async function getActiveAFKStatus(client, guildId, userId) {
  try {
    if (!client.db) {
      return null;
    }

    const afkKey = getAFKKey(guildId, userId);
    const afkData = await client.db.get(afkKey, null);

    if (!afkData) {
      return null;
    }

    // Check if expired
    if (afkData.expires_at) {
      const expiresAt = new Date(afkData.expires_at);
      if (Date.now() > expiresAt.getTime()) {
        // Expired, delete it
        await client.db.delete(afkKey);
        return null;
      }
    }

    return afkData;
  } catch (error) {
    logger.error(`Error getting AFK status for user ${userId}:`, error);
    return null;
  }
}

/**
 * Get formatted AFK message with time remaining
 */
export async function getFormattedAFKMessage(client, guildId, userId) {
  try {
    const afkData = await getActiveAFKStatus(client, guildId, userId);
    
    if (!afkData) {
      return null;
    }

    let message = `**${userId}** is currently AFK: *${afkData.reason || 'No reason provided'}*`;
    
    if (afkData.expires_at) {
      const expiresAt = new Date(afkData.expires_at);
      const timeLeft = expiresAt.getTime() - Date.now();
      
      if (timeLeft > 0) {
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        
        if (minutes > 0) {
          message += ` (back in ~${minutes}m ${seconds}s)`;
        } else if (seconds > 0) {
          message += ` (back in ~${seconds}s)`;
        }
      }
    }

    return message;
  } catch (error) {
    logger.error(`Error formatting AFK message for user ${userId}:`, error);
    return null;
  }
}
