import { LngLat } from "mapbox-gl";
import { POPRAD_POINTS } from "./data/points";
import axios from "axios";

const getSecond = (firstIndex: number, collection: LngLat[]) => {
  let secondRandomIndex;
  do {
    secondRandomIndex = Math.floor(Math.random() * collection.length);
  } while (secondRandomIndex === firstIndex);
  return collection[secondRandomIndex];
};

export const generateRandomPoints = async () => {
  const randomIndex = Math.floor(Math.random() * POPRAD_POINTS.length);
  const firstPoint = POPRAD_POINTS[randomIndex];

  const secondPoint = getSecond(randomIndex, POPRAD_POINTS);

  const { data } = await axios.get(
    `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${process.env.NEXT_PUBLIC_ORS_TOKEN}&start=${firstPoint.lng},${firstPoint.lat}&end=${secondPoint.lng},${secondPoint.lat}`
  );

  if (!data) {
    return [firstPoint, secondPoint];
  }

  const coords = data.features[0].geometry.coordinates;

  const newSecond: Array<number> = coords[Math.ceil(coords.length / 2)];
  const newSecondPoint = new LngLat(newSecond[0], newSecond[1]);

  return [firstPoint, newSecondPoint];
};

export const getGamePoints = (distance: number, diff: number) => {
  const rate = distance / 10;
  let num = 0;
  for (let i = 1; i < 5; i++) {
    if (diff <= rate * i) {
      num = 7 - i * 2;
      break;
    }
  }
  return Math.max(num, 0);
};

export const getOrdinalNumber = (n: number) => {
  if (n < 1 || n > 10) {
    throw new Error("Input must be a number between 1 and 10.");
  }

  switch (n) {
    case 1:
      return "1st";
    case 2:
      return "2nd";
    case 3:
      return "3rd";
    default:
      return `${n}th`;
  }
};

export const getReply = (points: number) => {
  if (points === 5) {
    return "excelent guess!";
  }
  if (points === 3) {
    return "average guess. Meh.";
  }
  if (points === 1) {
    return "shitty guess. Do better!";
  }
  return "pathetic guess. You suck.";
};
