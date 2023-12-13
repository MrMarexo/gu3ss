import { Inter } from "next/font/google";

import Map, {
  Layer,
  MapRef,
  Marker,
  NavigationControl,
  ScaleControl,
  Source,
} from "react-map-gl";

import { Car, Location } from "@/components/Icons";
import axios from "axios";
import { LngLat, GeoJSONSourceOptions, LngLatBounds } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import {
  generateRandomPoints,
  getGamePoints,
  getOrdinalNumber,
  getReply,
} from "@/helpers";
import { POPRAD_POINTS } from "@/data/points";

const inter = Inter({ subsets: ["latin"] });

const LEVEL_COUNT = 5;

const STORAGE_KEY_FOR_HIGH_SCORE = "HIGH-SCORE";

const POPRAD_BOUNDS = new LngLatBounds([
  {
    lng: 20.069518130440144,
    lat: 48.96051437696167,
  },
  { lng: 20.561936386777973, lat: 49.18319629969179 },
]);

export default function Home() {
  const [coords, setCoords] = useState<Array<LngLat>>();

  const mapRef = useRef<MapRef>(null);

  const [distanceData, setDistanceData] = useState<{
    distance: number;
    geojson: GeoJSONSourceOptions["data"];
  }>();

  const [isGameOver, setIsGameOver] = useState(true);

  const [overall, setOverall] = useState({
    score: 0,
    level: 1,
    games: 0,
    topScore: 0,
  });

  const [guess, setGuess] = useState<number>();
  const [result, setResult] = useState<{
    points: number;
    guess: number;
    difference: number;
    distance: number;
  }>();

  useEffect(() => {
    if (!mapRef) {
      return;
    }
    const fromStorage = parseInt(
      localStorage.getItem(STORAGE_KEY_FOR_HIGH_SCORE) ?? "0"
    );
    if (fromStorage) {
      setOverall((old) => ({ ...old, topScore: fromStorage }));
    }
  }, [mapRef]);

  useEffect(() => {
    if (!coords) {
      return;
    }

    const getData = async (retryCount = 5) => {
      try {
        const { data } = await axios.get(
          `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${process.env.NEXT_PUBLIC_ORS_TOKEN}&start=${coords[0].lng},${coords[0].lat}&end=${coords[1].lng},${coords[1].lat}`
        );
        const distance = Math.round(
          data.features[0].properties.summary.distance
        );
        const geojson = data.features[0];
        console.log("DISTANCE", distance);
        setDistanceData({ distance, geojson });
      } catch (error) {
        if (retryCount === 0) {
          console.error("Max retries reached. Failed to fetch data:", error);
          return;
        }
        console.log(`Retrying... Attempts left: ${retryCount}`);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before retrying
        getData(retryCount - 1);
      }
    };
    getData();
  }, [coords]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setGuess(parseInt(event.target.value));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!distanceData || !guess) {
      return;
    }
    const diff = Math.abs(guess - distanceData.distance);
    const points = getGamePoints(distanceData.distance, diff);

    if (points) {
      setOverall((old) => ({ ...old, score: old.score + points }));
    }

    setResult({
      points,
      difference: diff,
      distance: distanceData.distance,
      guess,
    });
  };

  const generateCoords = async () => {
    const points = await generateRandomPoints();
    mapRef?.current?.flyTo({ center: points[0] });

    setCoords(points);
  };

  const handleNext = () => {
    if (!result) {
      return;
    }
    setResult(undefined);
    setDistanceData(undefined);
    if (overall.level === LEVEL_COUNT) {
      setIsGameOver(true);
      if (overall.score > overall.topScore) {
        setOverall((old) => ({ ...old, topScore: old.score }));
        localStorage.setItem(
          STORAGE_KEY_FOR_HIGH_SCORE,
          overall.score.toString()
        );
      }
      return;
    }
    setOverall((old) => ({
      ...old,
      level: old.level + 1,
    }));
    generateCoords();
  };

  const handleRestart = () => {
    setOverall((old) => ({ ...old, level: 1, score: 0, games: old.games + 1 }));
    setIsGameOver(false);
    generateCoords();
  };

  return (
    <main className={`${inter.className}`}>
      <h1 className="absolute top-10 left-[50%] translate-x-[-50%] font-[700] text-6xl opacity-50 text-black z-30 my_header_shadow ">
        Gu3ss
      </h1>
      <div className="absolute top-10 right-6 z-10 text-black bg-[#ffffffa1] rounded-3xl px-6 py-4">
        <p>
          <b>{overall.topScore}</b> is your top
        </p>
      </div>
      <div className="absolute top-28 right-6 z-10 text-black bg-[#ffffffa1] rounded-3xl px-6 py-4">
        <p className="mb-2">
          <b>{getOrdinalNumber(overall.level)}</b> level
        </p>
        <p>
          <b>{overall.score}</b> points
        </p>
      </div>
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        mapStyle="mapbox://styles/marexo/cllo728t3003o01qx2ej3cgd3"
        style={{
          width: "100vw",
          height: "100vh",
        }}
        initialViewState={{
          latitude: POPRAD_POINTS[0].lat,
          longitude: POPRAD_POINTS[0].lng,
          zoom: 13,
        }}
        minZoom={12}
        maxBounds={POPRAD_BOUNDS}
      >
        <NavigationControl position="top-left" />
        <ScaleControl maxWidth={200} unit="metric" />
        {coords && (
          <>
            <Marker latitude={coords[0].lat} longitude={coords[0].lng}>
              <div className="p-1 bg-blue-700 rounded-full my_shadow">
                <Car />
              </div>
            </Marker>
            <Marker latitude={coords[1].lat} longitude={coords[1].lng}>
              <div className="p-1 bg-green-700 rounded-full my_shadow">
                <Location />
              </div>
            </Marker>
          </>
        )}
        {distanceData && result && (
          <Source type="geojson" data={distanceData.geojson}>
            <Layer
              id="line-layer"
              type="line"
              paint={{
                "line-color": "#b73939",
                "line-width": 2,
              }}
            />
          </Source>
        )}
      </Map>

      {result && (
        <div className="absolute left-[50%] bottom-40 translate-x-[-50%] z-10 text-black bg-[#ffffffa1] rounded-3xl px-6 py-4 flex flex-col">
          <p>
            Distance is <b>{result.distance}</b> meters.
          </p>
          <p>
            Your guess was <b>{result.guess}</b> meters.
          </p>
          <p>
            You got <b>{result.points}</b> points for this{" "}
            {getReply(result.points)}
          </p>
        </div>
      )}
      <div className="absolute left-[50%] bottom-10 translate-x-[-50%] z-10 text-black bg-[#ffffffa1] rounded-3xl px-6 py-4">
        {isGameOver ? (
          <div className="flex flex-col items-center gap-5">
            {overall.games ? (
              <p>
                You got <b className="text-2xl">{overall.score}</b> points out
                of <b>{overall.level * 5}</b>
              </p>
            ) : null}
            <button onClick={handleRestart}>
              Play{overall.games ? " again" : ""}
            </button>
          </div>
        ) : (
          <>
            <p className="mb-2">
              What is the <b>shortest driveable</b> distance between these two
              points?
            </p>
            {result ? (
              <div className="flex justify-center h-[40px]">
                <button onClick={handleNext}>Next</button>
              </div>
            ) : (
              <form
                className="flex justify-center h-[40px] gap-4"
                onSubmit={handleSubmit}
              >
                <input
                  type="number"
                  value={guess}
                  onChange={handleInputChange}
                  placeholder="Enter your guess"
                  className="py-2 px-3"
                />

                <button type="submit">Submit</button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
