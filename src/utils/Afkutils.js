import { getAFKKey } from './database.js';
import { logger } from './logger.js';

/**
 * Get AFK status for a user
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} AFK data or null if not AFK
 */
export async function getAFKStatus(client, guildId, userId) {
  try {
    if (!client.db) {
      logger.warn('Database not available for getAFKStatus');
      return null;
    }

    const afkKey = getAFKKey(guildId, userId);
    const afkData = await client.db.get(afkKey, null);

    if (!afkData) {
      return null;
    }

    // Check if AFK has expired
    if (afkData.expires_at) {
      const expiresAt = new Date(afkData.expires_at);
      if (Date.now() > expiresAt.getTime()) {
        // AFK expired, remove it
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
 * Set AFK status for a user
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @param {string} reason - AFK reason
 * @param {number|null} durationMinutes - Duration in minutes, null for indefinite
 * @returns {Promise<boolean>} Success status
 */
export async function setAFKStatus(client, guildId, userId, reason, durationMinutes = null) {
  try {
    if (!client.db) {
      logger.warn('Database not available for setAFKStatus');
      return false;
    }

    const afkKey = getAFKKey(guildId, userId);
    
    let expiresAt = null;
    if (durationMinutes) {
      expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    }

    const afkData = {
      reason,
      status_at: new Date().toISOString(),
      expires_at: expiresAt,
      userId,
      guildId
    };

    await client.db.set(afkKey, afkData);
    logger.info(`Set AFK status for user ${userId} in guild ${guildId}`);
    return true;
  } catch (error) {
    logger.error(`Error setting AFK status for user ${userId}:`, error);
    return false;
  }
}

/**
 * Remove AFK status for a user
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export async function removeAFKStatus(client, guildId, userId) {
  try {
    if (!client.db) {
      logger.warn('Database not available for removeAFKStatus');
      return false;
    }

    const afkKey = getAFKKey(guildId, userId);
    await client.db.delete(afkKey);
    logger.info(`Removed AFK status for user ${userId} in guild ${guildId}`);
    return true;
  } catch (error) {
    logger.error(`Error removing AFK status for user ${userId}:`, error);
    return false;
  }
}

/**
 * Check if user is AFK and return formatted message
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} Formatted AFK message or null
 */
export async function getAFKMessage(client, guildId, userId) {
  const afkData = await getAFKStatus(client, guildId, userId);
  
  if (!afkData) {
    return null;
  }

  let message = `**${userId}** is currently AFK: *${afkData.reason}*`;
  
  if (afkData.expires_at) {
    const expiresAt = new Date(afkData.expires_at);
    const timeLeft = expiresAt.getTime() - Date.now();
    const minutes = Math.floor(timeLeft / 60000);
    
    if (minutes > 0) {
      message += ` (back in ~${minutes} minutes)`;
    }
  }

  return message;
}
