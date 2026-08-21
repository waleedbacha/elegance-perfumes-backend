/**
 * Phone Utility - Simple phone number handling
 */

/**
 * Format phone number for WhatsApp
 * Input: 03459270471 or +923459270471 or 923459270471
 * Output: 923459270471
 */
const formatPhoneForWhatsApp = (phone) => {
  if (!phone) return null;

  // Remove all non-numeric
  let cleaned = phone.replace(/\D/g, "");

  // Remove leading 0
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  // If empty after cleaning, return null
  if (!cleaned) return null;

  // Add 92 if not present (Pakistan country code)
  if (!cleaned.startsWith("92")) {
    cleaned = `92${cleaned}`;
  }

  // Return only if it's 12 digits (92 + 10 digits)
  if (cleaned.length === 12) {
    return cleaned;
  }

  // If it's longer, it might already have country code
  if (cleaned.length > 12 && cleaned.startsWith("92")) {
    return cleaned.substring(0, 12);
  }

  return cleaned;
};

/**
 * Format phone for display
 * Input: 923459270471
 * Output: +92 345 9270471
 */
const formatPhoneForDisplay = (phone) => {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("92") && cleaned.length === 12) {
    const num = cleaned.substring(2);
    return `+${cleaned.substring(0, 2)} ${num.substring(0, 3)} ${num.substring(3, 6)} ${num.substring(6, 10)}`;
  }

  return `+${cleaned}`;
};

/**
 * Validate phone for WhatsApp
 */
const validatePhoneForWhatsApp = (phone) => {
  if (!phone) return false;
  const formatted = formatPhoneForWhatsApp(phone);
  return formatted && formatted.length === 12 && formatted.startsWith("92");
};

module.exports = {
  formatPhoneForWhatsApp,
  formatPhoneForDisplay,
  validatePhoneForWhatsApp,
};
