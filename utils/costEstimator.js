export function estimateTripCost(distanceKm = 500, days = 3) {
  const fuelCost = distanceKm * 5; // rough ₹5/km
  const hotel = days * 2000; // ₹2000/day
  const food = days * 800; // ₹800/day
  const fun = days * 1500; // activities cost

  return {
    fuel: fuelCost,
    hotel,
    food,
    fun,
    total: fuelCost + hotel + food + fun
  };
}
