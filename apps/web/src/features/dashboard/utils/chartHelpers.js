/**
 * Calculates SVG Donut Chart attributes for a given array of data segments.
 * Assumes SVG circle with r=15.915, so circumference is exactly 100.
 * 
 * @param {Array} segments - Array of objects containing a 'percentage' property.
 * @returns {Array} - The original array mapped with 'dashArray' and 'dashOffset' attributes added.
 */
export const calculateDonutSegments = (segments) => {
  let cumulativePercentage = 0;

  return segments.map(segment => {
    // Dash array format: "percentage (100 - percentage)"
    const dashArray = `${segment.percentage} ${100 - segment.percentage}`;
    
    // Dash offset pushes the start of the stroke backwards
    // Note: The circle should be rotated -90deg via CSS for 12 o'clock start
    const dashOffset = -cumulativePercentage;

    cumulativePercentage += segment.percentage;

    return {
      ...segment,
      dashArray,
      dashOffset
    };
  });
};
