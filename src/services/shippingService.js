/**
 * Shipping Service
 * Professional shipping and tracking management
 */

const axios = require("axios");
const { AppError } = require("../middleware/errorHandler");
const logger = require("../middleware/logger");

class ShippingService {
  constructor() {
    this.providers = {
      tcs: {
        name: "TCS",
        trackingUrl: "https://www.tcs.com.pk/tracking/",
        apiKey: process.env.TCS_API_KEY,
        apiUrl: process.env.TCS_API_URL,
        enabled: !!process.env.TCS_API_KEY,
      },
      leopards: {
        name: "Leopards Courier",
        trackingUrl: "https://www.leopardscourier.com/tracking/",
        apiKey: process.env.LEOPARDS_API_KEY,
        apiUrl: process.env.LEOPARDS_API_URL,
        enabled: !!process.env.LEOPARDS_API_KEY,
      },
      mnp: {
        name: "M&P Express",
        trackingUrl: "https://www.mnp.com.pk/tracking/",
        apiKey: process.env.MNP_API_KEY,
        apiUrl: process.env.MNP_API_URL,
        enabled: !!process.env.MNP_API_KEY,
      },
      postex: {
        name: "PostEx",
        trackingUrl: "https://www.postex.com.pk/tracking/",
        apiKey: process.env.POSTEX_API_KEY,
        apiUrl: process.env.POSTEX_API_URL,
        enabled: !!process.env.POSTEX_API_KEY,
      },
      rider: {
        name: "Rider",
        trackingUrl: "https://www.rider.com.pk/tracking/",
        apiKey: process.env.RIDER_API_KEY,
        apiUrl: process.env.RIDER_API_URL,
        enabled: !!process.env.RIDER_API_KEY,
      },
    };
  }

  /**
   * Calculate shipping cost
   */
  async calculateShippingCost(order) {
    try {
      const { items, shippingAddress, total } = order;

      // Calculate weight (mock - in real scenario, get from product)
      const totalWeight = items.reduce((sum, item) => {
        const weight = item.product?.weight || 0.5; // Default 0.5kg
        return sum + weight * item.quantity;
      }, 0);

      // Get distance (mock - in real scenario, use API)
      const distance = this.calculateDistance(
        shippingAddress.city,
        shippingAddress.state,
      );

      // Calculate cost based on weight and distance
      let baseCost = 150; // Base shipping cost
      const weightCost = Math.ceil(totalWeight) * 100;
      const distanceCost = Math.ceil(distance / 100) * 50;

      // Add handling fee
      const handlingFee = 50;

      let shippingCost = baseCost + weightCost + distanceCost + handlingFee;

      // Free shipping for orders over 5000 PKR
      if (total >= 5000) {
        shippingCost = 0;
      }

      // Express shipping
      const expressCost = shippingCost * 1.5;

      // Same-day delivery (if available in city)
      const sameDayCost = shippingCost * 2.5;

      return {
        standard: Math.round(shippingCost),
        express: Math.round(expressCost),
        sameDay: Math.round(sameDayCost),
        isFreeShipping: total >= 5000,
        weight: Math.ceil(totalWeight * 10) / 10,
        estimatedDays: this.getEstimatedDays(shippingAddress.city),
      };
    } catch (error) {
      logger.error("Shipping cost calculation failed", {
        orderId: order._id,
        error: error.message,
      });
      return {
        standard: 0,
        express: 0,
        sameDay: 0,
        isFreeShipping: false,
        weight: 0,
        estimatedDays: "3-5 business days",
      };
    }
  }

  /**
   * Calculate distance between cities (mock)
   */
  calculateDistance(city, state) {
    // Mock distance calculation
    const distances = {
      Karachi: 0,
      Lahore: 1200,
      Islamabad: 1500,
      Rawalpindi: 1480,
      Faisalabad: 1000,
      Multan: 800,
      Peshawar: 1700,
      Quetta: 900,
      Sialkot: 1300,
      Gujranwala: 1250,
      Hyderabad: 200,
      Sukkur: 600,
    };

    return distances[city] || 500;
  }

  /**
   * Get estimated delivery days
   */
  getEstimatedDays(city) {
    const days = {
      Karachi: "1-2 business days",
      Lahore: "2-3 business days",
      Islamabad: "2-3 business days",
      Rawalpindi: "2-3 business days",
      Faisalabad: "3-4 business days",
      Multan: "3-4 business days",
      Peshawar: "3-4 business days",
      Quetta: "4-5 business days",
      Sialkot: "3-4 business days",
      Gujranwala: "3-4 business days",
      Hyderabad: "2-3 business days",
    };

    return days[city] || "3-5 business days";
  }

  /**
   * Create shipment with carrier
   */
  async createShipment(order, provider = "tcs", method = "standard") {
    try {
      const carrier = this.providers[provider];
      if (!carrier || !carrier.enabled) {
        throw new AppError(
          `Shipping provider ${provider} not available`,
          400,
          "PROVIDER_NOT_AVAILABLE",
        );
      }

      // Mock shipment creation
      const trackingNumber = this.generateTrackingNumber(provider);

      const shipment = {
        provider: carrier.name,
        trackingNumber,
        trackingUrl: `${carrier.trackingUrl}${trackingNumber}`,
        status: "created",
        method,
        estimatedDelivery: this.getDeliveryDate(method),
        createdAt: new Date(),
      };

      logger.info("Shipment created", {
        orderNumber: order.orderNumber,
        provider: carrier.name,
        trackingNumber,
        method,
      });

      return shipment;
    } catch (error) {
      logger.error("Shipment creation failed", {
        orderNumber: order.orderNumber,
        provider,
        error: error.message,
      });
      throw new AppError("Failed to create shipment", 500, "SHIPMENT_FAILED");
    }
  }

  /**
   * Generate tracking number
   */
  generateTrackingNumber(provider) {
    const prefix = {
      tcs: "TCS",
      leopards: "LPS",
      mnp: "MNP",
      postex: "PEX",
      rider: "RDR",
    };

    const prefixCode = prefix[provider] || "SHP";
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();

    return `${prefixCode}-${timestamp}-${random}`;
  }

  /**
   * Get delivery date based on method
   */
  getDeliveryDate(method) {
    const now = new Date();
    const days = {
      "same-day": 0,
      express: 1,
      standard: 3,
    };

    const addDays = days[method] || 3;
    const deliveryDate = new Date(now);
    deliveryDate.setDate(deliveryDate.getDate() + addDays);

    // Skip weekends
    while (deliveryDate.getDay() === 0 || deliveryDate.getDay() === 6) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
    }

    return deliveryDate;
  }

  /**
   * Track shipment
   */
  async trackShipment(trackingNumber, provider) {
    try {
      const carrier = this.providers[provider];
      if (!carrier) {
        throw new AppError(
          `Shipping provider ${provider} not found`,
          404,
          "PROVIDER_NOT_FOUND",
        );
      }

      // Mock tracking data
      const trackingData = {
        trackingNumber,
        provider: carrier.name,
        status: "in-transit",
        currentLocation: "Karachi",
        history: [
          {
            status: "Picked Up",
            location: "Karachi",
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
            description: "Package picked up from warehouse",
          },
          {
            status: "In Transit",
            location: "Karachi",
            timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
            description: "Package in transit",
          },
          {
            status: "Out for Delivery",
            location: "Karachi",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            description: "Package out for delivery",
          },
        ],
        estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      logger.info("Shipment tracked", {
        trackingNumber,
        provider,
        status: trackingData.status,
      });

      return trackingData;
    } catch (error) {
      logger.error("Shipment tracking failed", {
        trackingNumber,
        provider,
        error: error.message,
      });
      throw new AppError("Failed to track shipment", 500, "TRACKING_FAILED");
    }
  }

  /**
   * Get available shipping providers
   */
  getAvailableProviders() {
    const providers = [];

    Object.entries(this.providers).forEach(([key, value]) => {
      if (value.enabled) {
        providers.push({
          id: key,
          name: value.name,
          trackingUrl: value.trackingUrl,
        });
      }
    });

    return providers;
  }

  /**
   * Validate shipping address
   */
  validateAddress(address) {
    const errors = [];

    if (!address.name) errors.push("Name is required");
    if (!address.phone) errors.push("Phone number is required");
    if (!address.street) errors.push("Street address is required");
    if (!address.city) errors.push("City is required");
    if (!address.state) errors.push("State is required");
    if (!address.zipCode) errors.push("ZIP code is required");

    // Phone number validation
    if (address.phone && !/^[\+]?[0-9]{10,15}$/.test(address.phone)) {
      errors.push("Invalid phone number format");
    }

    // ZIP code validation
    if (address.zipCode && !/^\d{5}$/.test(address.zipCode)) {
      errors.push("ZIP code must be 5 digits");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
module.exports = new ShippingService();
